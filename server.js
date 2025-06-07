const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const { spawn } = require("child_process");
const bcrypt = require("bcrypt");
const activeGames = new Map();
const { dbGet, dbRun, dbAll } = require("./db");
const {
    createUser,
    findUserByUsername,
    comparePassword,
    generateToken,
    authenticate,
    authenticateAdmin,
} = require("./auth");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//app.use(express.static(path.join(__dirname, "noughts-and-crosses-for-5", "public")));
app.use(
    express.static(path.join(__dirname, "noughts-and-crosses-for-5", "build")),
);

// send all non-api requests to react
app.get("*", (req, res) => {
    res.sendFile(
        path.join(__dirname, "noughts-and-crosses-for-5", "build", "index.html"),
    );
});

const playingDir = path.join(__dirname, "playing_programs");

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Define a constant for the admin password instead of duplicating it
const ADMIN_PASSWORD = "qwert"; // Change this to a secure password!

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

// Helper function to get program's room from the database
async function getProgramRoom(programName) {
    try {
        const program = await dbGet(
            "SELECT room_id FROM programs WHERE name = ?",
            [programName],
        );
        return program ? program.room_id : null;
    } catch (error) {
        console.error("Error getting program room:", error);
        return null;
    }
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

// Legacy admin authentication middleware (for routes that don't use JWT)
const legacyAuthenticateAdmin = (req, res, next) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
};

// Authentication routes
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        console.log(`Login attempt: ${username}`);

        const user = await findUserByUsername(username);

        if (!user) {
            console.log(`User ${username} not found`);
            return res.status(401).json({
                success: false,
                message: "Invalid username or password",
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
                classroom: user.classroom,
                token,
            });
        } else {
            console.log(
                `Failed login attempt for ${username} - incorrect password`,
            );
            res.status(401).json({
                success: false,
                message: "Invalid username or password",
            });
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
});

app.post("/api/register", async (req, res) => {
    const { username, password, role = "student", classroom } = req.body;

    try {
        // Check if username already exists
        const existingUser = await findUserByUsername(username);

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Username already exists",
            });
        }

        // Create new user
        await createUser(username, password, role, classroom);

        res.json({
            success: true,
            message: "User registered successfully",
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
});

// Support legacy admin login
app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: "Invalid password" });
    }
});

app.get(
    "/api/admin/programs/classroom-counts",
    authenticateAdmin,
    async (req, res) => {
        try {
            const counts = await dbAll(`
            SELECT u.classroom, COUNT(*) as count
            FROM programs p
            JOIN users u ON p.owner_id = u.id
            WHERE u.classroom IS NOT NULL
            GROUP BY u.classroom
        `);

            res.json({ counts });
        } catch (error) {
            console.error("Error fetching program counts by classroom:", error);
            res.status(500).json({ error: "Failed to fetch program counts" });
        }
    },
);

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
        console.error("Error fetching rooms:", error);
        res.status(500).json({ error: "Failed to fetch rooms" });
    }
});

// Create a new room
app.post("/api/admin/rooms", authenticateAdmin, async (req, res) => {
    try {
        const { roomId, description } = req.body;

        // Check if room already exists
        const existingRoom = await dbGet(
            "SELECT * FROM rooms WHERE room_id = ?",
            [roomId],
        );
        if (existingRoom) {
            return res.status(400).json({ error: "Room ID already exists" });
        }

        const student_count = await dbGet("SELECT COUNT(*) FROM users");

        const result = await dbRun(
            "INSERT INTO rooms (room_id, description, created_by) VALUES (?, ?, ?)",
            [roomId, description, req.user.id],
        );

        const newRoom = await dbGet("SELECT * FROM rooms WHERE id = ?", [
            result.id,
        ]);
        res.json({ success: true, room: newRoom });
    } catch (error) {
        console.error("Error creating room:", error);
        res.status(500).json({ error: "Failed to create room" });
    }
});

app.get(
    "/api/admin/rooms/student-counts",
    authenticateAdmin,
    async (req, res) => {
        try {
            const counts = await dbAll(`
            SELECT classroom, COUNT(*) as count
            FROM users
            WHERE classroom IS NOT NULL
            GROUP BY classroom
        `);

            res.json({ counts });
        } catch (error) {
            console.error("Error fetching classroom counts:", error);
            res.status(500).json({
                error: "Failed to fetch classroom student counts",
            });
        }
    },
);

// Delete a room
app.delete("/api/admin/rooms/:roomId", authenticateAdmin, async (req, res) => {
    try {
        const { roomId } = req.params;
        await dbRun("DELETE FROM rooms WHERE room_id = ?", [roomId]);
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting room:", error);
        res.status(500).json({ error: "Failed to delete room" });
    }
});

// Legacy room management
app.get("/api/legacy/admin/rooms", (req, res) => {
    try {
        // Get rooms from the database instead of using the Set
        dbAll("SELECT room_id FROM rooms")
            .then((dbRooms) => {
                const roomIds = dbRooms.map((room) => room.room_id);
                res.json({ rooms: roomIds });
            })
            .catch((error) => {
                console.error("Error fetching rooms:", error);
                res.status(500).json({ error: "Failed to fetch rooms" });
            });
    } catch (error) {
        console.error("Error in legacy room fetch:", error);
        res.status(500).json({ error: "Server error" });
    }
});

app.post(
    "/api/legacy/admin/rooms",
    legacyAuthenticateAdmin,
    async (req, res) => {
        try {
            const { roomId, description = "" } = req.body;

            // Check if room already exists
            const existingRoom = await dbGet(
                "SELECT * FROM rooms WHERE room_id = ?",
                [roomId],
            );
            if (existingRoom) {
                return res
                    .status(400)
                    .json({ error: "Room ID already exists" });
            }

            // Add room to the database
            await dbRun(
                "INSERT INTO rooms (room_id, description) VALUES (?, ?)",
                [roomId, description],
            );

            res.json({ success: true });
        } catch (error) {
            console.error("Error creating room:", error);
            res.status(500).json({ error: "Failed to create room" });
        }
    },
);

app.delete(
    "/api/legacy/admin/rooms/:roomId",
    legacyAuthenticateAdmin,
    async (req, res) => {
        try {
            const { roomId } = req.params;
            await dbRun("DELETE FROM rooms WHERE room_id = ?", [roomId]);
            res.json({ success: true });
        } catch (error) {
            console.error("Error deleting room:", error);
            res.status(500).json({ error: "Failed to delete room" });
        }
    },
);

// FILE UPLOADS AND CODE MANAGEMENT
app.post("/api/uploads", upload.single("file"), async (req, res) => {
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
        const room = req.body.room;
        console.log("Compiling for nickname:", nickname);

        // Check if room exists if provided
        if (room) {
            const roomExists = await dbGet(
                "SELECT * FROM rooms WHERE room_id = ?",
                [room],
            );
            if (!roomExists) {
                return res.status(400).json({ error: "Invalid room" });
            }
        }

        try {
            const userCompiledPath = path.join(playingDir, nickname);
            console.log("Starting compilation:", {
                source: req.file.path,
                target: userCompiledPath,
            });

            const result = await compileCode(req.file.path, userCompiledPath);
            console.log("Compilation result:", result);

            // Get the code from the file
            const code = fs.readFileSync(req.file.path, "utf8");

            // Check for existing program in database
            const existingProgram = await dbGet(
                "SELECT * FROM programs WHERE name = ?",
                [nickname],
            );

            // Save or update program in database
            if (existingProgram) {
                await dbRun(
                    "UPDATE programs SET code = ?, room_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [code, room || null, existingProgram.id],
                );
            } else {
                // Note: This will associate the program with user ID 1 (likely admin) since
                // the upload endpoint isn't authenticated yet
                await dbRun(
                    "INSERT INTO programs (name, code, owner_id, room_id, compiled_path) VALUES (?, ?, ?, ?, ?)",
                    [nickname, code, 1, room || null, userCompiledPath],
                );
            }

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

// GAME MANAGEMENT
app.post("/api/start-game", async (req, res) => {
    try {
        console.log("Received start-game request with body:", req.body);

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

// Add game history table
app.post("/api/games/history", authenticate, async (req, res) => {
    try {
        const { player1, player2, winner, moves } = req.body;

        await dbRun(
            "INSERT INTO game_history (player1, player2, winner, moves) VALUES (?, ?, ?, ?)",
            [player1, player2, winner, JSON.stringify(moves)],
        );

        res.json({ success: true });
    } catch (error) {
        console.error("Error saving game history:", error);
        res.status(500).json({ error: "Failed to save game history" });
    }
});

// Get game history
app.get("/api/games/history", authenticate, async (req, res) => {
    try {
        const games = await dbAll(
            "SELECT * FROM game_history ORDER BY created_at DESC LIMIT 50",
        );

        // Parse the moves JSON before sending
        const parsedGames = games.map((game) => ({
            ...game,
            moves: JSON.parse(game.moves || "[]"),
        }));

        res.json({ games: parsedGames });
    } catch (error) {
        console.error("Error fetching game history:", error);
        res.status(500).json({ error: "Failed to fetch game history" });
    }
});

// Interactive game
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

// CODE MANAGEMENT
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

app.post("/api/compile-code", authenticate, async (req, res) => {
    try {
        const { nickname, code } = req.body;
        // room parameter is removed since we're not storing it

        if (!nickname || !code) {
            return res
                .status(400)
                .json({ error: "Nickname and code are required" });
        }

        console.log("Compiling code for:", nickname);

        // Save code to file
        const filePath = path.join(playingDir, `${nickname}.cpp`);
        const compiledPath = path.join(playingDir, nickname);

        // Write the code to file
        await fs.promises.writeFile(filePath, code);

        // Check if program already exists in database
        const existingProgram = await dbGet(
            "SELECT * FROM programs WHERE name = ?",
            [nickname],
        );

        if (existingProgram) {
            // Update existing program - note no room_id
            await dbRun(
                "UPDATE programs SET code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [code, existingProgram.id],
            );
        } else {
            // Create new program - note no room_id
            await dbRun(
                "INSERT INTO programs (name, code, owner_id, compiled_path) VALUES (?, ?, ?, ?)",
                [nickname, code, req.user.id, compiledPath],
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
                error: "Compilation failed: " + compileError.message,
            });
        }
    } catch (error) {
        console.error("Error saving/compiling code:", error);
        res.status(500).json({
            error: "Server error during compilation: " + error.message,
        });
    }
});

// Get list of available opponents (from database)
app.get("/api/get-opponents", async (req, res) => {
    try {
        const { room } = req.query;

        let query = `
            SELECT p.name, p.owner_id, u.classroom
            FROM programs p
            INNER JOIN users u ON p.owner_id = u.id
        `;
        let params = [];

        if (room) {
            query += " WHERE u.classroom = ?";
            params.push(room);
        }

        const programs = await dbAll(query, params);

        const opponents = programs.map((program) => ({
            name: program.name,
            room: program.classroom,
        }));

        res.json({ opponents });
    } catch (error) {
        console.error("Error reading opponents:", error);
        res.status(500).json({ error: "Failed to get opponents list" });
    }
});

// BOT VS BOT GAME
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

        gameProcess.on("close", async (code) => {
            console.log("Game process closed with code:", code);

            try {
                const gameData = JSON.parse(outputData);

                // Save game to history
                try {
                    await dbRun(
                        "INSERT INTO game_history (player1, player2, winner, moves) VALUES (?, ?, ?, ?)",
                        [
                            player1,
                            player2,
                            gameData.winner || null,
                            JSON.stringify(gameData.moves || []),
                        ],
                    );
                } catch (dbError) {
                    console.error("Error saving game to history:", dbError);
                }

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

// USER PROFILE
app.get("/api/profile", authenticate, async (req, res) => {
    try {
        // Don't return password
        const user = await dbGet(
            "SELECT id, username, role, created_at FROM users WHERE id = ?",
            [req.user.id],
        );

        // Get user's programs
        const programs = await dbAll(
            "SELECT id, name, room_id, created_at, updated_at FROM programs WHERE owner_id = ?",
            [req.user.id],
        );

        res.json({ user, programs });
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

// Change password
app.put("/api/profile/password", authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Get user with password
        const user = await dbGet("SELECT * FROM users WHERE id = ?", [
            req.user.id,
        ]);

        // Verify current password
        const isMatch = await comparePassword(currentPassword, user.password);
        if (!isMatch) {
            return res
                .status(400)
                .json({ error: "Current password is incorrect" });
        }

        // Hash and update new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await dbRun("UPDATE users SET password = ? WHERE id = ?", [
            hashedPassword,
            req.user.id,
        ]);

        res.json({ success: true });
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ error: "Failed to update password" });
    }
});

// ADMIN USER MANAGEMENT
app.get("/api/admin/users", authenticateAdmin, async (req, res) => {
    try {
        // Don't return passwords in the query
        const users = await dbAll(
            "SELECT id, username, role, created_at, classroom FROM users",
        );
        res.json({ users });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

app.put("/api/admin/users/:userId", authenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!["admin", "student", "teacher"].includes(role)) {
            return res.status(400).json({ error: "Invalid role" });
        }

        await dbRun("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Failed to update user" });
    }
});

// INITIALIZE GAME HISTORY TABLE
(async function initGameHistory() {
    try {
        await dbRun(`
            CREATE TABLE IF NOT EXISTS game_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player1 TEXT NOT NULL,
                player2 TEXT NOT NULL,
                winner TEXT,
                moves TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Game history table initialized");
    } catch (error) {
        console.error("Error initializing game history table:", error);
    }
})();

// DATABASE BACKUP ENDPOINT
app.post("/api/admin/backup-database", authenticateAdmin, async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupDir = path.join(__dirname, "backups");

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const backupPath = path.join(backupDir, `backup_${timestamp}.db`);

        // Simple file copy for backup
        fs.copyFileSync(
            path.join(__dirname, "data", "codingomoku.db"),
            backupPath,
        );

        res.json({
            success: true,
            message: "Database backup created successfully",
            backupPath: backupPath,
        });
    } catch (error) {
        console.error("Backup failed:", error);
        res.status(500).json({ error: "Failed to backup database" });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
        error: "Server error",
        message:
            process.env.NODE_ENV === "production"
                ? "An unexpected error occurred"
                : err.message,
    });
});

// Update user classroom assignment
app.put(
    "/api/admin/users/:userId/classroom",
    authenticateAdmin,
    async (req, res) => {
        try {
            const { userId } = req.params;
            const { classroom } = req.body;

            // Validate the classroom exists if it's provided
            if (classroom) {
                const roomExists = await dbGet(
                    "SELECT * FROM rooms WHERE room_id = ?",
                    [classroom],
                );
                if (!roomExists) {
                    return res
                        .status(400)
                        .json({ error: "invalid classroom id" });
                }
            }

            await dbRun("UPDATE users SET classroom = ? WHERE id = ?", [
                classroom || null,
                userId,
            ]);

            res.json({ success: true });
        } catch (error) {
            console.error("Error updating user classroom:", error);
            res.status(500).json({ error: "failed to update user classroom" });
        }
    },
);

// Start a tournament for a classroom
app.post("/api/admin/start-tournament", authenticateAdmin, async (req, res) => {
    try {
        const { roomId } = req.body;

        if (!roomId) {
            return res.status(400).json({ error: "Room ID is required" });
        }

        // Begin transaction
        await dbRun("BEGIN TRANSACTION");

        // Delete any existing tournaments for this room
        await dbRun(
            "DELETE FROM tournament_results WHERE tournament_id IN (SELECT id FROM tournaments WHERE room_id = ?)",
            [roomId],
        );
        await dbRun(
            "DELETE FROM tournament_matches WHERE tournament_id IN (SELECT id FROM tournaments WHERE room_id = ?)",
            [roomId],
        );
        await dbRun("DELETE FROM tournaments WHERE room_id = ?", [roomId]);

        // Get all programs whose owners belong to this classroom
        const programs = await dbAll(
            `
            SELECT p.name, p.id
            FROM programs p
            JOIN users u ON p.owner_id = u.id
            WHERE u.classroom = ?
        `,
            [roomId],
        );

        if (programs.length < 2) {
            await dbRun("ROLLBACK");
            return res
                .status(400)
                .json({
                    error: "Need at least 2 programs to start a tournament",
                });
        }

        // Calculate total matches: 10 games between each pair of programs
        const gamesPerPair = 10; // 5 as O, 5 as X
        const totalMatches =
            ((programs.length * (programs.length - 1)) / 2) * gamesPerPair;

        // Create tournament record
        const tournamentResult = await dbRun(
            "INSERT INTO tournaments (room_id, status, total_matches, completed_matches) VALUES (?, ?, ?, ?)",
            [roomId, "in_progress", totalMatches, 0],
        );

        const tournamentId = tournamentResult.id;

        // Schedule all matches
        const programNames = programs.map((p) => p.name);

        // Create matches (each program vs every other program, 10 times)
        for (let i = 0; i < programNames.length; i++) {
            for (let j = i + 1; j < programNames.length; j++) {
                const player1 = programNames[i];
                const player2 = programNames[j];

                // 5 games with player1 as O (first parameter)
                for (let game = 0; game < 5; game++) {
                    await dbRun(
                        "INSERT INTO tournament_matches (tournament_id, player1, player2, player1_piece, status) VALUES (?, ?, ?, ?, ?)",
                        [tournamentId, player1, player2, "O", "pending"],
                    );
                }

                // 5 games with player2 as O (first parameter)
                for (let game = 0; game < 5; game++) {
                    await dbRun(
                        "INSERT INTO tournament_matches (tournament_id, player1, player2, player1_piece, status) VALUES (?, ?, ?, ?, ?)",
                        [tournamentId, player2, player1, "O", "pending"],
                    );
                }
            }
        }

        // Initialize results table with all players
        for (const program of programNames) {
            await dbRun(
                "INSERT INTO tournament_results (tournament_id, player) VALUES (?, ?)",
                [tournamentId, program],
            );
        }

        // Commit transaction
        await dbRun("COMMIT");

        // Start the tournament in the background
        startTournamentGames(tournamentId);

        res.json({
            success: true,
            message: "Tournament started",
            tournamentId,
            totalMatches,
            programs: programNames,
        });
    } catch (error) {
        // Rollback on error
        await dbRun("ROLLBACK");
        console.error("Error starting tournament:", error);
        res.status(500).json({ error: "Failed to start tournament" });
    }
});

async function startTournamentGames(tournamentId) {
    try {
        console.log(
            `Starting tournament games for tournament ID ${tournamentId}`,
        );

        // Get all pending matches
        const matches = await dbAll(
            'SELECT * FROM tournament_matches WHERE tournament_id = ? AND status = "pending"',
            [tournamentId],
        );

        console.log(`Found ${matches.length} pending matches`);

        // Process matches one by one
        for (const match of matches) {
            try {
                console.log(
                    `Processing match: ${match.player1} vs ${match.player2}, ${match.player1} plays as ${match.player1_piece}`,
                );

                // Update match status to in_progress
                await dbRun(
                    'UPDATE tournament_matches SET status = "in_progress" WHERE id = ?',
                    [match.id],
                );

                // Run the actual game between the two programs
                const gameResult = await runBotGame(
                    match.player1,
                    match.player2,
                );

                // ADD DEBUGGING HERE
                console.log(`Game result for match ${match.id}:`, {
                    winner: gameResult.winner,
                    success: gameResult.success,
                    moves: gameResult.moves ? gameResult.moves.length : 0,
                    fullResult: gameResult,
                });

                // Determine the winner based on the symbol returned
                let winner = null;
                if (gameResult.winner === "O") {
                    winner = match.player1; // First player was O
                    console.log(`Winner determined: ${winner} (O)`);
                } else if (gameResult.winner === "X") {
                    winner = match.player2; // Second player was X
                    console.log(`Winner determined: ${winner} (X)`);
                } else {
                    console.log(
                        `No winner - draw or error. gameResult.winner = ${gameResult.winner}`,
                    );
                }

                // Update match with results
                await dbRun(
                    `UPDATE tournament_matches
                     SET winner = ?,
                         moves = ?,
                         status = "completed",
                         completed_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [winner, JSON.stringify(gameResult.moves || []), match.id],
                );

                console.log(`Match ${match.id} updated with winner: ${winner}`);

                // Rest of the function stays the same...
                // Update tournament results with scoring
                if (winner) {
                    await dbRun(
                        "UPDATE tournament_results SET wins = wins + 1, points = points + 3 WHERE tournament_id = ? AND player = ?",
                        [tournamentId, winner],
                    );

                    const loser =
                        winner === match.player1
                            ? match.player2
                            : match.player1;
                    await dbRun(
                        "UPDATE tournament_results SET losses = losses + 1 WHERE tournament_id = ? AND player = ?",
                        [tournamentId, loser],
                    );
                } else {
                    await dbRun(
                        "UPDATE tournament_results SET draws = draws + 1, points = points + 1 WHERE tournament_id = ? AND player = ?",
                        [tournamentId, match.player1],
                    );
                    await dbRun(
                        "UPDATE tournament_results SET draws = draws + 1, points = points + 1 WHERE tournament_id = ? AND player = ?",
                        [tournamentId, match.player2],
                    );
                }

                await dbRun(
                    "UPDATE tournaments SET completed_matches = completed_matches + 1 WHERE id = ?",
                    [tournamentId],
                );

                const tournament = await dbGet(
                    "SELECT * FROM tournaments WHERE id = ?",
                    [tournamentId],
                );

                if (tournament.completed_matches >= tournament.total_matches) {
                    await dbRun(
                        'UPDATE tournaments SET status = "completed", completed_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [tournamentId],
                    );
                }

                console.log(
                    `Match completed: ${match.player1} vs ${match.player2}, winner: ${winner || "draw"}`,
                );
            } catch (matchError) {
                console.error(
                    `Error processing match ${match.id}:`,
                    matchError,
                );

                await dbRun(
                    'UPDATE tournament_matches SET status = "failed" WHERE id = ?',
                    [match.id],
                );

                await dbRun(
                    "UPDATE tournaments SET completed_matches = completed_matches + 1 WHERE id = ?",
                    [tournamentId],
                );
            }
        }

        console.log(`Tournament ${tournamentId} processing completed`);
    } catch (error) {
        console.error(`Error processing tournament ${tournamentId}:`, error);
    }
}

// function runBotGame(player1, player2) {
//     return new Promise((resolve, reject) => {
//         try {
//             const gameProcess = spawn(
//                 "python3",
//                 [
//                     path.join(playingDir, "bot_interactive_judge.py"),
//                     player1,
//                     player2,
//                     "O" // First player is always O
//                 ],
//                 {
//                     cwd: playingDir,
//                 }
//             );

//             let outputData = "";

//             gameProcess.stdout.on("data", (data) => {
//                 outputData += data.toString();
//             });

//             gameProcess.stderr.on("data", (data) => {
//                 console.log(`Bot game debug: ${data.toString()}`);
//             });

//             gameProcess.on("close", (code) => {
//                 if (code !== 0) {
//                     reject(new Error(`Game process exited with code ${code}`));
//                     return;
//                 }

//                 try {
//                     const gameData = JSON.parse(outputData);
//                     resolve(gameData);
//                 } catch (error) {
//                     reject(new Error(`Failed to parse game data: ${error.message}`));
//                 }
//             });
//         } catch (error) {
//             reject(error);
//         }
//     });
// }
function runBotGame(player_O, player_X) {
    return new Promise((resolve, reject) => {
        try {
            console.log(`Running bot game: ${player_O} (O) vs ${player_X} (X)`);

            const gameProcess = spawn(
                "python3",
                [
                    path.join(playingDir, "bot_interactive_judge.py"),
                    player_O, // First parameter is always O
                    player_X, // Second parameter is always X
                    "O", // This indicates first player is O
                ],
                { cwd: playingDir },
            );

            let outputData = "";

            gameProcess.stdout.on("data", (data) => {
                outputData += data.toString();
            });

            gameProcess.stderr.on("data", (data) => {
                console.log(`Bot game debug: ${data.toString()}`);
            });

            gameProcess.on("close", (code) => {
                try {
                    const gameData = JSON.parse(outputData);
                    resolve(gameData);
                } catch (error) {
                    reject(
                        new Error(
                            `Failed to parse game data: ${error.message}, raw output: ${outputData}`,
                        ),
                    );
                }
            });

            // Add timeout to prevent hanging
            setTimeout(() => {
                gameProcess.kill();
                reject(new Error("Game timeout"));
            }, 30000); // 30 second timeout
        } catch (error) {
            reject(error);
        }
    });
}

app.get(
    "/api/admin/tournaments/:id/status",
    authenticateAdmin,
    async (req, res) => {
        try {
            const { id } = req.params;

            const tournament = await dbGet(
                "SELECT * FROM tournaments WHERE id = ?",
                [id],
            );

            if (!tournament) {
                return res.status(404).json({ error: "Tournament not found" });
            }

            // Calculate progress percentage
            const progress =
                tournament.total_matches > 0
                    ? Math.round(
                          (tournament.completed_matches /
                              tournament.total_matches) *
                              100,
                      )
                    : 0;

            res.json({
                id: tournament.id,
                roomId: tournament.room_id,
                status: tournament.status,
                progress,
                totalMatches: tournament.total_matches,
                completedMatches: tournament.completed_matches,
                createdAt: tournament.created_at,
                completedAt: tournament.completed_at,
            });
        } catch (error) {
            console.error("Error getting tournament status:", error);
            res.status(500).json({ error: "Failed to get tournament status" });
        }
    },
);

app.get(
    "/api/admin/tournaments/:id/results",
    authenticateAdmin,
    async (req, res) => {
        try {
            const { id } = req.params;

            const tournament = await dbGet(
                "SELECT * FROM tournaments WHERE id = ?",
                [id],
            );

            if (!tournament) {
                return res.status(404).json({ error: "Tournament not found" });
            }

            // Get results sorted by points (leaderboard)
            const results = await dbAll(
                `SELECT * FROM tournament_results
             WHERE tournament_id = ?
             ORDER BY points DESC, wins DESC`,
                [id],
            );

            res.json({
                tournamentId: tournament.id,
                roomId: tournament.room_id,
                status: tournament.status,
                results,
            });
        } catch (error) {
            console.error("Error getting tournament results:", error);
            res.status(500).json({ error: "Failed to get tournament results" });
        }
    },
);

app.delete(
    "/api/admin/tournaments/:id",
    authenticateAdmin,
    async (req, res) => {
        try {
            const { id } = req.params;

            // Begin transaction
            await dbRun("BEGIN TRANSACTION");

            // Delete tournament matches
            await dbRun(
                "DELETE FROM tournament_matches WHERE tournament_id = ?",
                [id],
            );

            // Delete tournament results
            await dbRun(
                "DELETE FROM tournament_results WHERE tournament_id = ?",
                [id],
            );

            // Delete the tournament itself
            await dbRun("DELETE FROM tournaments WHERE id = ?", [id]);

            // Commit transaction
            await dbRun("COMMIT");

            res.json({
                success: true,
                message: "Tournament deleted successfully",
            });
        } catch (error) {
            // Rollback on error
            await dbRun("ROLLBACK");
            console.error("Error deleting tournament:", error);
            res.status(500).json({ error: "Failed to delete tournament" });
        }
    },
);

app.get(
    "/api/admin/rooms/:roomId/tournaments",
    authenticateAdmin,
    async (req, res) => {
        try {
            const { roomId } = req.params;

            const tournaments = await dbAll(
                "SELECT * FROM tournaments WHERE room_id = ? ORDER BY created_at DESC",
                [roomId],
            );

            res.json({ tournaments });
        } catch (error) {
            console.error("Error fetching tournaments:", error);
            res.status(500).json({ error: "Failed to fetch tournaments" });
        }
    },
);

(async function initTournamentTables() {
    try {
        // Create tournaments table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS tournaments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                total_matches INTEGER DEFAULT 0,
                completed_matches INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL
            )
        `);

        // Create tournament_matches table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS tournament_matches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_id INTEGER NOT NULL,
                player1 TEXT NOT NULL,
                player2 TEXT NOT NULL,
                player1_piece TEXT NOT NULL,
                winner TEXT NULL,
                moves TEXT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL,
                FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
            )
        `);

        // Create tournament_results table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS tournament_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_id INTEGER NOT NULL,
                player TEXT NOT NULL,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                draws INTEGER DEFAULT 0,
                points INTEGER DEFAULT 0,
                FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
            )
        `);

        console.log("Tournament tables initialized");
    } catch (error) {
        console.error("Error initializing tournament tables:", error);
    }
})();

app.get("/api/classroom/leaderboard", authenticate, async (req, res) => {
    try {
        // Get user's classroom
        const user = await dbGet("SELECT classroom FROM users WHERE id = ?", [
            req.user.id,
        ]);

        if (!user || !user.classroom) {
            return res.json({
                success: false,
                message: "Nie jesteś przypisany do żadnej klasy",
            });
        }

        // Get the most recent completed tournament for this classroom
        const latestTournament = await dbGet(
            `
            SELECT * FROM tournaments
            WHERE room_id = ? AND status = 'completed'
            ORDER BY completed_at DESC
            LIMIT 1
        `,
            [user.classroom],
        );

        if (!latestTournament) {
            return res.json({
                success: false,
                message: "Brak zakończonych zawodów dla twojej klasy",
            });
        }

        // Get results for this tournament
        const results = await dbAll(
            `
            SELECT tr.*, t.completed_at, t.created_at as tournament_start
            FROM tournament_results tr
            JOIN tournaments t ON tr.tournament_id = t.id
            WHERE tr.tournament_id = ?
            ORDER BY tr.points DESC, tr.wins DESC
        `,
            [latestTournament.id],
        );

        // Get tournament details including match statistics
        const tournamentStats = await dbGet(
            `
            SELECT
                COUNT(*) as total_matches,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_matches,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_matches
            FROM tournament_matches
            WHERE tournament_id = ?
        `,
            [latestTournament.id],
        );

        res.json({
            success: true,
            classroom: user.classroom,
            tournament: {
                id: latestTournament.id,
                startDate: latestTournament.created_at,
                endDate: latestTournament.completed_at,
                totalMatches: tournamentStats.total_matches,
                completedMatches: tournamentStats.completed_matches,
                failedMatches: tournamentStats.failed_matches,
            },
            leaderboard: results.map((result, index) => ({
                position: index + 1,
                player: result.player,
                points: result.points,
                wins: result.wins,
                draws: result.draws,
                losses: result.losses,
                matchesPlayed: result.wins + result.draws + result.losses,
            })),
        });
    } catch (error) {
        console.error("Error fetching classroom leaderboard:", error);
        res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
});

// Get all tournaments for user's classroom (for history)
app.get("/api/classroom/tournaments", authenticate, async (req, res) => {
    try {
        const user = await dbGet("SELECT classroom FROM users WHERE id = ?", [
            req.user.id,
        ]);

        if (!user || !user.classroom) {
            return res.json({
                success: false,
                message: "Nie jesteś przypisany do żadnej klasy",
            });
        }

        const tournaments = await dbAll(
            `
            SELECT * FROM tournaments
            WHERE room_id = ?
            ORDER BY created_at DESC
        `,
            [user.classroom],
        );

        res.json({
            success: true,
            classroom: user.classroom,
            tournaments: tournaments.map((t) => ({
                id: t.id,
                status: t.status,
                startDate: t.created_at,
                endDate: t.completed_at,
                totalMatches: t.total_matches,
                completedMatches: t.completed_matches,
                progress:
                    t.total_matches > 0
                        ? Math.round(
                              (t.completed_matches / t.total_matches) * 100,
                          )
                        : 0,
            })),
        });
    } catch (error) {
        console.error("Error fetching classroom tournaments:", error);
        res.status(500).json({ error: "Failed to fetch tournaments" });
    }
});

// const PORT = process.env.PORT || 4000;

// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

if (process.env.NODE_ENV === "production") {
    try {
        // HTTPS server on port 443
        const httpsOptions = {
            key: fs.readFileSync(
                "/etc/letsencrypt/live/code-in.online/privkey.pem",
            ),
            cert: fs.readFileSync(
                "/etc/letsencrypt/live/code-in.online/fullchain.pem",
            ),
        };

        https.createServer(httpsOptions, app).listen(443, () => {
            console.log("HTTPS Server running on port 443");
        });

        // HTTP server that redirects to HTTPS
        http.createServer((req, res) => {
            res.writeHead(301, {
                Location: `https://${req.headers.host}${req.url}`,
            });
            res.end();
        }).listen(80, () => {
            console.log(
                "HTTP Server running on port 80 (redirecting to HTTPS)",
            );
        });
    } catch (error) {
        console.error("Failed to start HTTPS server:", error);
        console.log("Falling back to HTTP on port 4000");
        app.listen(4000, () => {
            console.log("Server running on port 4000");
        });
    }
} else {
    // Development server
    app.listen(4000, () => {
        console.log("Development server running on port 4000");
    });
}
