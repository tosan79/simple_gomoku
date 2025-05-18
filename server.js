const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const { spawn } = require("child_process");
const bcrypt = require("bcrypt");
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

app.use(express.static(path.join(__dirname, "noughts-and-crosses-for-5", "public")));

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
        const program = await dbGet('SELECT room_id FROM programs WHERE name = ?', [programName]);
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
                classroom: user.classroom,
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

app.post("/api/register", async (req, res) => {
    const { username, password, role = "student", classroom } = req.body;

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
        await createUser(username, password, role, classroom);

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

// Support legacy admin login
app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: "Invalid password" });
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

// Legacy room management
app.get("/api/legacy/admin/rooms", (req, res) => {
    try {
        // Get rooms from the database instead of using the Set
        dbAll('SELECT room_id FROM rooms').then(dbRooms => {
            const roomIds = dbRooms.map(room => room.room_id);
            res.json({ rooms: roomIds });
        }).catch(error => {
            console.error('Error fetching rooms:', error);
            res.status(500).json({ error: 'Failed to fetch rooms' });
        });
    } catch (error) {
        console.error('Error in legacy room fetch:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post("/api/legacy/admin/rooms", legacyAuthenticateAdmin, async (req, res) => {
    try {
        const { roomId, description = '' } = req.body;

        // Check if room already exists
        const existingRoom = await dbGet('SELECT * FROM rooms WHERE room_id = ?', [roomId]);
        if (existingRoom) {
            return res.status(400).json({ error: 'Room ID already exists' });
        }

        // Add room to the database
        await dbRun(
            'INSERT INTO rooms (room_id, description) VALUES (?, ?)',
            [roomId, description]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ error: 'Failed to create room' });
    }
});

app.delete("/api/legacy/admin/rooms/:roomId", legacyAuthenticateAdmin, async (req, res) => {
    try {
        const { roomId } = req.params;
        await dbRun('DELETE FROM rooms WHERE room_id = ?', [roomId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ error: 'Failed to delete room' });
    }
});

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
            const roomExists = await dbGet('SELECT * FROM rooms WHERE room_id = ?', [room]);
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
            const code = fs.readFileSync(req.file.path, 'utf8');

            // Check for existing program in database
            const existingProgram = await dbGet('SELECT * FROM programs WHERE name = ?', [nickname]);

            // Save or update program in database
            if (existingProgram) {
                await dbRun(
                    'UPDATE programs SET code = ?, room_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [code, room || null, existingProgram.id]
                );
            } else {
                // Note: This will associate the program with user ID 1 (likely admin) since
                // the upload endpoint isn't authenticated yet
                await dbRun(
                    'INSERT INTO programs (name, code, owner_id, room_id, compiled_path) VALUES (?, ?, ?, ?, ?)',
                    [nickname, code, 1, room || null, userCompiledPath]
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
            'INSERT INTO game_history (player1, player2, winner, moves) VALUES (?, ?, ?, ?)',
            [player1, player2, winner, JSON.stringify(moves)]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving game history:', error);
        res.status(500).json({ error: 'Failed to save game history' });
    }
});

// Get game history
app.get("/api/games/history", authenticate, async (req, res) => {
    try {
        const games = await dbAll('SELECT * FROM game_history ORDER BY created_at DESC LIMIT 50');

        // Parse the moves JSON before sending
        const parsedGames = games.map(game => ({
            ...game,
            moves: JSON.parse(game.moves || '[]')
        }));

        res.json({ games: parsedGames });
    } catch (error) {
        console.error('Error fetching game history:', error);
        res.status(500).json({ error: 'Failed to fetch game history' });
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

// Get list of available opponents (from database)
app.get("/api/get-opponents", async (req, res) => {
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
                        'INSERT INTO game_history (player1, player2, winner, moves) VALUES (?, ?, ?, ?)',
                        [player1, player2, gameData.winner || null, JSON.stringify(gameData.moves || [])]
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
            'SELECT id, username, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        // Get user's programs
        const programs = await dbAll(
            'SELECT id, name, room_id, created_at, updated_at FROM programs WHERE owner_id = ?',
            [req.user.id]
        );

        res.json({ user, programs });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Change password
app.put("/api/profile/password", authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Get user with password
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);

        // Verify current password
        const isMatch = await comparePassword(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Hash and update new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await dbRun(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, req.user.id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// ADMIN USER MANAGEMENT
app.get("/api/admin/users", authenticateAdmin, async (req, res) => {
    try {
        // Don't return passwords in the query
        const users = await dbAll('SELECT id, username, role, created_at FROM users');
        res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.put("/api/admin/users/:userId", authenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!['admin', 'student', 'teacher'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        await dbRun('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
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
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, "backups");

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const backupPath = path.join(backupDir, `backup_${timestamp}.db`);

        // Simple file copy for backup
        fs.copyFileSync(
            path.join(__dirname, "data", "codingomoku.db"),
            backupPath
        );

        res.json({
            success: true,
            message: "Database backup created successfully",
            backupPath: backupPath
        });
    } catch (error) {
        console.error('Backup failed:', error);
        res.status(500).json({ error: 'Failed to backup database' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Server error',
        message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
    });
});

// Update user classroom assignment
app.put("/api/admin/users/:userId/classroom", authenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { classroom } = req.body;

        // Validate the classroom exists if it's provided
        if (classroom) {
            const roomExists = await dbGet('SELECT * FROM rooms WHERE room_id = ?', [classroom]);
            if (!roomExists) {
                return res.status(400).json({ error: 'invalid classroom id' });
            }
        }

        await dbRun(
            'UPDATE users SET classroom = ? WHERE id = ?',
            [classroom || null, userId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating user classroom:', error);
        res.status(500).json({ error: 'failed to update user classroom' });
    }
});

// Start a tournament for a classroom
app.post("/api/admin/start-tournament", authenticateAdmin, async (req, res) => {
    try {
        const { roomId } = req.body;

        if (!roomId) {
            return res.status(400).json({ error: 'Room ID is required' });
        }

        // Get all programs in this room
        const programs = await dbAll('SELECT name FROM programs WHERE room_id = ?', [roomId]);

        if (programs.length < 2) {
            return res.status(400).json({ error: 'Need at least 2 programs to start a tournament' });
        }

        // Schedule games between all programs
        const totalGames = programs.length * (programs.length - 1);

        // In a real implementation, you would start these games and track results
        // For now, we'll just return success

        res.json({
            success: true,
            message: 'Tournament started',
            totalGames,
            programs: programs.map(p => p.name)
        });
    } catch (error) {
        console.error('Error starting tournament:', error);
        res.status(500).json({ error: 'Failed to start tournament' });
    }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
