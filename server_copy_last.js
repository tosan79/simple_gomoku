const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const { spawn } = require("child_process");
const activeGames = new Map();
const { dbGet, dbRun, dbAll } = require('./db');
const {
    createUser,
    findUserByUsername,
    comparePassword,
    generateToken,
    authenticate,
    authenticateAdmin
} = require('./auth');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "noughts-and-crosses-for-5", "build")));

const playingDir = path.join(__dirname, "playing_programs");

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

function compileCode(filePath, outputPath) {
    return new Promise((resolve, reject) => {
        exec(
            `g++ ${filePath} -o ${outputPath} -std=c++17`,
            (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(outputPath);
            },
        );
    });
}

// Run game function
function runGame() {
    return new Promise((resolve, reject) => {
        // Use process.cwd() to get current working directory
        const currentDir = process.cwd();
        const judgePath = path.join(currentDir, "playing_programs", "judge.py");

        // Change working directory to where the agents are
        const command = `cd ${playingDir} && python3 ${judgePath}`;

        exec(command, async (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }

            try {
                // Copy moves.json to React's public directory
                const movesPath = path.join(playingDir, "moves.json");
                const newMovesPath = path.join(
                    __dirname,
                    "noughts-and-crosses-for-5",
                    "public",
                    "moves.json",
                );

                // Read the original moves.json
                const movesData = await fs.promises.readFile(movesPath);

                // Write it to the React public directory
                await fs.promises.writeFile(newMovesPath, movesData);

                resolve(stdout);
            } catch (copyError) {
                reject(copyError);
            }
        });
    });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log("Saving file to:", playingDir);
        cb(null, playingDir);
    },
    filename: function (req, file, cb) {
        let filename = req.body.nickname
            ? `${req.body.nickname}.cpp`
            : `${Date.now()}-${file.originalname}`;
        console.log("Generated filename:", filename);
        cb(null, filename);
    },
});

const upload = multer({
    storage: storage,
    // limits: {
    //     fileSize: 1024 * 1024 * 5, // 5MB limit
    // },
    fileFilter: (req, file, cb) => {
        if (file.originalname.endsWith(".cpp")) {
            cb(null, true);
        } else {
            cb(new Error("Only .cpp files are allowed"));
        }
    },
});

app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        console.log(`Login attempt: ${username}`);

        const user = await findUserByUsername(username);

        if (!user) {
            console.log(`User ${username} not found`);
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        const isMatch = await comparePassword(password, user.password);

        if (isMatch) {
            console.log(`User ${username} logged in successfully`);

            // Generate JWT token
            const token = generateToken(user);

            res.json({
                success: true,
                message: "Login successful",
                username: user.username,
                role: user.role,
                token
            });
        } else {
            console.log(`Failed login attempt for ${username} - incorrect password`);
            res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

// Update your register route
app.post("/api/register", async (req, res) => {
    const { username, password, role = "student" } = req.body;

    try {
        // Check if username already exists
        const existingUser = await findUserByUsername(username);

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Username already exists"
            });
        }

        // Create new user
        await createUser(username, password, role);

        res.json({
            success: true,
            message: "User registered successfully"
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

// ROOM MANAGEMENT

app.get("/api/admin/rooms", authenticateAdmin, async (req, res) => {
    try {
        const rooms = await dbAll(`
            SELECT r.*, u.username as created_by_username
            FROM rooms r
            LEFT JOIN users u ON r.created_by = u.id
        `);
        res.json({ rooms });
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

// Create a new room
app.post("/api/admin/rooms", authenticateAdmin, async (req, res) => {
    try {
        const { roomId, description } = req.body;

        // Check if room already exists
        const existingRoom = await dbGet('SELECT * FROM rooms WHERE room_id = ?', [roomId]);
        if (existingRoom) {
            return res.status(400).json({ error: 'Room ID already exists' });
        }

        const result = await dbRun(
            'INSERT INTO rooms (room_id, description, created_by) VALUES (?, ?, ?)',
            [roomId, description, req.user.id]
        );

        const newRoom = await dbGet('SELECT * FROM rooms WHERE id = ?', [result.id]);
        res.json({ success: true, room: newRoom });
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ error: 'Failed to create room' });
    }
});

// Delete a room
app.delete("/api/admin/rooms/:roomId", authenticateAdmin, async (req, res) => {
    try {
        const { roomId } = req.params;
        await dbRun('DELETE FROM rooms WHERE room_id = ?', [roomId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ error: 'Failed to delete room' });
    }
});

// OLD PART OF LOGIC

app.post("/api/uploads", upload.single("file"), async (req, res) => {
    // console.log("=== UPLOAD REQUEST RECEIVED ===");
    // console.log("Time:", new Date().toISOString());

    try {
        console.log("Headers:", req.headers);
        console.log("Body keys:", Object.keys(req.body));

        if (!req.file) {
            console.log("No file in request");
            return res.status(400).json({ error: "No file uploaded." });
        }

        console.log("File received:", {
            originalName: req.file.originalname,
            savedAs: req.file.filename,
            size: req.file.size,
            path: req.file.path,
        });

        const nickname = req.body.nickname;
        console.log("Compiling for nickname:", nickname);

        try {
            const userCompiledPath = path.join(playingDir, nickname);
            console.log("Starting compilation:", {
                source: req.file.path,
                target: userCompiledPath,
            });

            const result = await compileCode(req.file.path, userCompiledPath);
            console.log("Compilation result:", result);

            console.log("Sending success response");
            res.json({
                message: "File uploaded and compiled successfully",
                filename: req.file.filename,
            });
        } catch (compileError) {
            console.error("Compilation error:", compileError);
            res.status(500).json({
                error: "Compilation failed",
                details: compileError.message,
            });
        }
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({
            error: "Server error",
            details: error.message,
        });
    }
    // console.log("=== UPLOAD REQUEST COMPLETED ===");
});

app.get("/api/check-nickname/:nickname", (req, res) => {
    const { nickname } = req.params;

    try {
        // Check if a .cpp file exists for this nickname
        const filePath = path.join(playingDir, `${nickname}.cpp`);
        const exists = fs.existsSync(filePath);

        res.json({
            exists: exists,
            nickname: nickname,
        });
    } catch (error) {
        console.error("Error checking nickname:", error);
        res.status(500).json({
            error: "Failed to check nickname",
            details: error.message,
        });
    }
});

app.post("/api/start-game", async (req, res) => {
    try {
        console.log("Received start-game request with body:", req.body); // Debug log

        const opponent = req.body.opponent;
        const nickname = req.body.nickname;

        if (!opponent || !nickname) {
            return res.status(400).json({
                error: "Missing required fields",
                received: req.body,
            });
        }

        // Compile opponent's program
        const opponentPath = path.join(playingDir, `${opponent}.cpp`);
        const opponentCompiledPath = path.join(playingDir, "agent2");

        await compileCode(opponentPath, opponentCompiledPath);

        // Run the game
        const gameResults = await runGame();

        res.json({
            message: "Game completed",
            results: gameResults,
            movesFileReady: true,
        });
    } catch (error) {
        console.error("Error in start-game:", error);
        res.status(500).json({
            error: "Server error during game initialization",
            details: error.message,
        });
    }
});

const gameState = {
    board: Array(10)
        .fill()
        .map(() => Array(10).fill(".")),
    currentGame: null,
};

// Add these new endpoints for interactive mode
// app.post("/api/start-interactive-game", async (req, res) => {
//     try {
//         const { nickname, opponent } = req.body;
//         console.log("Starting interactive game:", { nickname, opponent });

//         // Compile opponent's program
//         const opponentPath = path.join(playingDir, `${opponent}.cpp`);
//         const opponentCompiledPath = path.join(playingDir, opponent); // This will create 'admin' or 'random' in playing_programs

//         console.log("Compiling opponent program...");
//         console.log("Source path:", opponentPath);
//         console.log("Output path:", opponentCompiledPath);

//         try {
//             await compileCode(opponentPath, opponentCompiledPath);
//             console.log("Compilation successful");
//         } catch (compileError) {
//             console.error("Compilation error:", compileError);
//             return res
//                 .status(500)
//                 .json({ error: "Failed to compile opponent program" });
//         }

//         const gameProcess = spawn(
//             "python3",
//             [path.join(playingDir, "interactive_judge.py"), opponent],
//             {
//                 cwd: playingDir, // Set working directory to playing_programs
//                 stdio: ["pipe", "pipe", "pipe"],
//             },
//         );

//         // Add error handling for process spawn
//         gameProcess.on("error", (error) => {
//             console.error("Failed to start game process:", error);
//         });

//         const gameId = Date.now().toString();
//         activeGames.set(gameId, gameProcess);

//         // Debug logging
//         gameProcess.stderr.on("data", (data) => {
//             console.log("Interactive judge debug:", data.toString());
//         });

//         gameProcess.stdout.on("data", (data) => {
//             console.log("Interactive judge output:", data.toString());
//         });

//         res.json({ gameId, success: true });
//     } catch (error) {
//         console.error("Error starting interactive game:", error);
//         res.status(500).json({ error: "Failed to start game" });
//     }
// });

// app.post("/api/start-interactive-game", async (req, res) => {
//     try {
//         const { nickname } = req.body;

//         if (!nickname) {
//             return res.status(400).json({ error: "Nickname is required" });
//         }

//         // Check if compiled program exists
//         const compiledPath = path.join(playingDir, nickname);
//         if (!fs.existsSync(compiledPath)) {
//             return res
//                 .status(400)
//                 .json({ error: "Program not found. Please compile first." });
//         }

//         const gameProcess = spawn(
//             "python3",
//             [path.join(playingDir, "interactive_judge.py"), nickname], // Using 'random' as opponent
//             {
//                 cwd: playingDir,
//                 stdio: ["pipe", "pipe", "pipe"],
//             },
//         );

//         const gameId = Date.now().toString();
//         activeGames.set(gameId, gameProcess);

//         // Debug logging
//         gameProcess.stderr.on("data", (data) => {
//             console.log("Interactive judge debug:", data.toString());
//         });

//         gameProcess.stdout.on("data", (data) => {
//             console.log("Interactive judge output:", data.toString());
//         });

//         res.json({ gameId, success: true });
//     } catch (error) {
//         console.error("Error starting game:", error);
//         res.status(500).json({ error: "Failed to start game" });
//     }
// });

app.post("/api/start-interactive-game", async (req, res) => {
    try {
        const { nickname, selectedPiece } = req.body;

        if (!nickname) {
            return res.status(400).json({ error: "Nickname is required" });
        }

        const gameProcess = spawn(
            "python3",
            [
                path.join(playingDir, "interactive_judge.py"),
                nickname,
                selectedPiece,
            ],
            {
                cwd: playingDir,
                stdio: ["pipe", "pipe", "pipe"],
            },
        );

        const gameId = Date.now().toString();
        activeGames.set(gameId, gameProcess);

        gameProcess.stderr.on("data", (data) => {
            console.log("Interactive judge debug:", data.toString());
        });

        gameProcess.stdout.on("data", (data) => {
            console.log("Interactive judge output:", data.toString());
        });

        res.json({ gameId, success: true });
    } catch (error) {
        console.error("Error starting game:", error);
        res.status(500).json({ error: "Failed to start game" });
    }
});

// app.post("/api/make-move", (req, res) => {
//     const { gameId, x, y } = req.body;
//     const gameProcess = activeGames.get(gameId);

//     if (!gameProcess) {
//         return res.status(404).json({ error: "Game not found" });
//     }

//     try {
//         // Send move to interactive judge
//         gameProcess.stdin.write(JSON.stringify({ x, y }) + "\n");

//         // Set up timeout
//         const timeout = setTimeout(() => {
//             console.log("Move timeout - sending error response");
//             res.status(500).json({ error: "Move timeout" });
//             // Cleanup the stuck game
//             gameProcess.kill();
//             activeGames.delete(gameId);
//         }, 5000); // 5 second timeout

//         // Get response from interactive judge
//         gameProcess.stdout.once("data", (data) => {
//             clearTimeout(timeout); // Clear the timeout if we got a response
//             try {
//                 const response = JSON.parse(data);
//                 res.json(response);

//                 // If there's a winner, clean up the game
//                 if (response.winner) {
//                     gameProcess.stdin.write("exit\n");
//                     gameProcess.kill();
//                     activeGames.delete(gameId);
//                 }
//             } catch (error) {
//                 console.error("Error processing game response:", error);
//                 res.status(500).json({ error: "Invalid response from game" });
//             }
//         });
//     } catch (error) {
//         console.error("Error in make-move:", error);
//         res.status(500).json({ error: "Failed to process move" });
//     }
// });

app.post("/api/make-move", (req, res) => {
    const { gameId, x, y } = req.body;
    const gameProcess = activeGames.get(gameId);

    if (!gameProcess) {
        return res.status(404).json({ error: "Game not found" });
    }

    try {
        // Special case for getting initial move when player is X
        if (x === -1 && y === -1) {
            // Set up timeout for initial move
            const timeout = setTimeout(() => {
                console.log("Initial move timeout - sending error response");
                res.status(500).json({ error: "Initial move timeout" });
                // Cleanup the stuck game
                gameProcess.kill();
                activeGames.delete(gameId);
            }, 5000); // 5 second timeout

            // Get initial move from interactive judge
            gameProcess.stdout.once("data", (data) => {
                clearTimeout(timeout);
                try {
                    const response = JSON.parse(data);
                    res.json(response);
                } catch (error) {
                    console.error("Error processing initial move:", error);
                    res.status(500).json({
                        error: "Invalid response from game",
                    });
                }
            });
            return;
        }

        // Regular move handling
        gameProcess.stdin.write(JSON.stringify({ x, y }) + "\n");

        // Set up timeout
        const timeout = setTimeout(() => {
            console.log("Move timeout - sending error response");
            res.status(500).json({ error: "Move timeout" });
            // Cleanup the stuck game
            gameProcess.kill();
            activeGames.delete(gameId);
        }, 5000); // 5 second timeout

        // Get response from interactive judge
        gameProcess.stdout.once("data", (data) => {
            clearTimeout(timeout);
            try {
                const response = JSON.parse(data);
                res.json(response);

                // If there's a winner, clean up the game
                if (response.winner) {
                    gameProcess.stdin.write("exit\n");
                    gameProcess.kill();
                    activeGames.delete(gameId);
                }
            } catch (error) {
                console.error("Error processing game response:", error);
                res.status(500).json({ error: "Invalid response from game" });
            }
        });
    } catch (error) {
        console.error("Error in make-move:", error);
        res.status(500).json({ error: "Failed to process move" });
    }
});

app.post("/api/end-game", (req, res) => {
    const { gameId } = req.body;
    const gameProcess = activeGames.get(gameId);

    if (gameProcess) {
        gameProcess.stdin.write("exit\n");
        gameProcess.kill();
        activeGames.delete(gameId);
    }

    res.json({ success: true });
});

// const options = {
//     key: fs.readFileSync(path.join(__dirname, "certs/privkey.pem")),
//     cert: fs.readFileSync(path.join(__dirname, "certs/fullchain.pem")),
// };

const PORT = process.env.PORT || 4000;

const defaultCode = `#include <iostream>
#include <sstream>
#include <string>

#define N 10

class Board {
  public:
    char board[N][N];

    Board() {
      for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++)
          board[i][j] = '.';
    }

    void make_move(int x, int y, char player) {
      board[x][y] = player;
      std::cout << x << " " << y << std::endl;
      std::cout.flush();
    }

    char switch_player(char player) {
      return player == 'O' ? 'X' : 'O';
    }

    void random_move(char player) {
      std::srand(time(nullptr));

      int x, y;
      do {
        x = std::rand() % N;
        y = std::rand() % N;
      } while (board[x][y] != '.');

      make_move(x, y, player);
    }

    void read_opponents_move(char player, const std::string &str) {
      std::istringstream iss(str);
      int x, y;
      iss >> x >> y;
      board[x][y] = switch_player(player);
    }
};

int main() {
  Board b;
  char player;
  std::string line;

  std::cout << "ready" << std::endl;
  std::cout.flush();

  // first line (assign the pieces to players, 'O' goes first)
  std::getline(std::cin, line);
  if (line == "start") {
    player = 'O';
    b.random_move(player);
  } else {
    player = 'X';
    b.read_opponents_move(player, line);
    b.random_move(player);
  }

  while (true) {
    std::getline(std::cin, line);

    if (line == "end") return 0;
    if (line.empty() && player == 'X') return 1;

    b.read_opponents_move(player, line);
    b.random_move(player);
}

return 0;
}`;

app.get("/api/get-code/:nickname", (req, res) => {
    const { nickname } = req.params;
    const filePath = path.join(playingDir, `${nickname}.cpp`);

    try {
        if (fs.existsSync(filePath)) {
            const code = fs.readFileSync(filePath, "utf8");
            res.json({ code });
        } else {
            // Return empty or default code
            res.json({ code: defaultCode });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to read code file" });
    }
});

// Endpoint to compile code
// app.post("/api/compile-code", async (req, res) => {
//     try {
//         const { nickname, code } = req.body;

//         if (!nickname || !code) {
//             return res
//                 .status(400)
//                 .json({ error: "Nickname and code are required" });
//         }

//         console.log("Compiling code for:", nickname); // Debug log

//         // Save code to file
//         const filePath = path.join(playingDir, `${nickname}.cpp`);
//         const compiledPath = path.join(playingDir, nickname);

//         // Write the code to file
//         await fs.promises.writeFile(filePath, code);
//         console.log("Code written to:", filePath); // Debug log

//         // Compile the code
//         try {
//             await compileCode(filePath, compiledPath);
//             console.log("Compilation successful"); // Debug log
//             res.json({ success: true });
//         } catch (compileError) {
//             console.error("Compilation error:", compileError);
//             res.status(400).json({
//                 error: "Compilation failed: " + compileError.message,
//             });
//         }
//     } catch (error) {
//         console.error("Error saving/compiling code:", error);
//         res.status(500).json({
//             error: "Server error during compilation: " + error.message,
//         });
//     }
// });

app.post("/api/compile-code", authenticate, async (req, res) => {
    try {
        const { nickname, code, room } = req.body;

        if (!nickname || !code) {
            return res.status(400).json({ error: "Nickname and code are required" });
        }

        console.log("Compiling code for:", nickname);

        // Save code to file
        const filePath = path.join(playingDir, `${nickname}.cpp`);
        const compiledPath = path.join(playingDir, nickname);

        // Write the code to file
        await fs.promises.writeFile(filePath, code);

        // Check if program already exists in database
        const existingProgram = await dbGet('SELECT * FROM programs WHERE name = ?', [nickname]);

        if (existingProgram) {
            // Update existing program
            await dbRun(
                'UPDATE programs SET code = ?, room_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [code, room || null, existingProgram.id]
            );
        } else {
            // Create new program
            await dbRun(
                'INSERT INTO programs (name, code, owner_id, room_id, compiled_path) VALUES (?, ?, ?, ?, ?)',
                [nickname, code, req.user.id, room || null, compiledPath]
            );
        }

        // Compile the code
        try {
            await compileCode(filePath, compiledPath);
            console.log("Compilation successful");
            res.json({ success: true });
        } catch (compileError) {
            console.error("Compilation error:", compileError);
            res.status(400).json({
                error: "Compilation failed: " + compileError.message
            });
        }
    } catch (error) {
        console.error("Error saving/compiling code:", error);
        res.status(500).json({
            error: "Server error during compilation: " + error.message
        });
    }
});

// Get list of available opponents (programs in playing_programs directory)
// app.get("/api/get-opponents", (req, res) => {
//     try {
//         const files = fs.readdirSync(playingDir);
//         // Filter for .cpp files and remove .cpp extension
//         const opponents = files
//             .filter((file) => file.endsWith(".cpp"))
//             .map((file) => file.replace(".cpp", ""));
//         res.json({ opponents });
//     } catch (error) {
//         console.error("Error reading opponents:", error);
//         res.status(500).json({ error: "Failed to get opponents list" });
//     }
// });

app.get("/api/get-opponents", authenticate, async (req, res) => {
    try {
        const { room } = req.query;

        let query = 'SELECT name, room_id FROM programs';
        let params = [];

        if (room) {
            query += ' WHERE room_id = ?';
            params.push(room);
        }

        const programs = await dbAll(query, params);

        const opponents = programs.map(program => ({
            name: program.name,
            room: program.room_id
        }));

        res.json({ opponents });
    } catch (error) {
        console.error("Error reading opponents:", error);
        res.status(500).json({ error: "Failed to get opponents list" });
    }
});

// Start a game between two bots
app.post("/api/start-bot-game", async (req, res) => {
    try {
        const { player1, player2, selectedPiece } = req.body;
        console.log(`Starting game between ${player1} and ${player2}`);

        if (!player1 || !player2) {
            return res.status(400).json({ error: "Both players are required" });
        }

        const gameProcess = spawn(
            "python3",
            [
                path.join(playingDir, "bot_interactive_judge.py"),
                player1,
                player2,
                selectedPiece,
            ],
            {
                cwd: playingDir,
            },
        );

        let outputData = "";

        gameProcess.stdout.on("data", (data) => {
            console.log("Received data from python:", data.toString());
            outputData += data.toString();
        });

        gameProcess.stderr.on("data", (data) => {
            console.log(`Debug: ${data.toString()}`);
        });

        gameProcess.on("close", (code) => {
            console.log("Game process closed with code:", code);
            console.log("Final output data:", outputData);

            try {
                const gameData = JSON.parse(outputData);
                res.json(gameData);
            } catch (error) {
                console.error("Error parsing game data:", error);
                res.status(500).json({
                    error: "Failed to parse game data",
                    rawOutput: outputData,
                });
            }
        });
    } catch (error) {
        console.error("Error starting bot game:", error);
        res.status(500).json({ error: "Failed to start game" });
    }
});

const rooms = new Set();
const ADMIN_PASSWORD = "qwert"; // Change this!

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
};

// Admin endpoints
app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: "Invalid password" });
    }
});

app.get("/api/admin/rooms", (req, res) => {
    res.json({ rooms: Array.from(rooms) });
});

app.post("/api/admin/rooms", authenticateAdmin, (req, res) => {
    const { roomId } = req.body;
    rooms.add(roomId);
    res.json({ success: true });
});

app.delete("/api/admin/rooms/:roomId", authenticateAdmin, (req, res) => {
    const { roomId } = req.params;
    rooms.delete(roomId);
    res.json({ success: true });
});

// Modify get-opponents endpoint to filter by room
app.get("/api/get-opponents", (req, res) => {
    try {
        const { room } = req.query;
        const files = fs.readdirSync(playingDir);

        // Get all programs with their room information
        const opponents = files
            .filter((file) => file.endsWith(".cpp"))
            .map((file) => {
                const programName = file.replace(".cpp", "");
                const programRoom = getProgramRoom(programName); // You'll need to implement this
                return { name: programName, room: programRoom };
            })
            .filter((program) => !room || program.room === room) // Filter by room if provided
            .map((program) => program.name);

        res.json({ opponents });
    } catch (error) {
        console.error("Error reading opponents:", error);
        res.status(500).json({ error: "Failed to get opponents list" });
    }
});

// Helper function to get program's room
function getProgramRoom(programName) {
    // Implement this based on how you store room information
    // Could be from a database or a metadata file
    return null; // Replace with actual implementation
}

// Modify upload endpoint to include room information
app.post("/api/uploads", upload.single("file"), async (req, res) => {
    try {
        const { nickname, room } = req.body;

        // Validate room exists
        if (room && !rooms.has(room)) {
            return res.status(400).json({ error: "Invalid room" });
        }

        // Save room information along with the program
        // Implement this based on your storage strategy

        // Rest of the upload logic...
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({
            error: "Server error",
            details: error.message,
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
