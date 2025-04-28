const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { exec, spawn } = require("child_process");
const activeGames = new Map();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const playingDir = path.join(__dirname, "playing_programs");

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

function compileCode(filePath, outputPath) {
    return new Promise((resolve, reject) => {
        exec(`g++ ${filePath} -o ${outputPath}`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(outputPath);
        });
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

// Configure multer with absolute path
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log("Saving file to:", uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        let filename = req.body.nickname
            ? `${req.body.nickname}.cpp`
            : `${Date.now()}-${file.originalname}`;
        console.log("Generated filename:", filename);
        cb(null, filename);
    },
});

// Add file size limits and file type validation
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

app.post("/uploads", upload.single("file"), async (req, res) => {
    try {
        console.log("Received upload request");

        if (!req.file) {
            console.log("No file received");
            return res.status(400).send("No file uploaded.");
        }

        console.log("File details:", {
            originalName: req.file.originalname,
            savedAs: req.file.filename,
            size: req.file.size,
            path: req.file.path,
            nickname: req.body.nickname,
        });

        const nickname = req.body.nickname;

        // Compile user's program
        const userCompiledPath = path.join(playingDir, "agent1");
        await compileCode(req.file.path, userCompiledPath);

        res.json({
            message: "File uploaded and compiled successfully",
            filename: req.file.filename,
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Server error during processing");
    }
});

app.post("/start-game", async (req, res) => {
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

// server.js - Add these endpoints
const gameState = {
    board: Array(10)
        .fill()
        .map(() => Array(10).fill(".")),
    currentGame: null,
};

app.post("/start-interactive-game", async (req, res) => {
    try {
        const { nickname } = req.body;

        if (!nickname) {
            return res.status(400).json({ error: "Nickname is required" });
        }

        // Check if compiled program exists
        const compiledPath = path.join(playingDir, nickname);
        if (!fs.existsSync(compiledPath)) {
            return res
                .status(400)
                .json({ error: "Program not found. Please compile first." });
        }

        const gameProcess = spawn(
            "python3",
            [path.join(playingDir, "interactive_judge.py"), nickname], // Using 'random' as opponent
            {
                cwd: playingDir,
                stdio: ["pipe", "pipe", "pipe"],
            },
        );

        const gameId = Date.now().toString();
        activeGames.set(gameId, gameProcess);

        // Debug logging
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

app.post("/make-move", (req, res) => {
    const { gameId, x, y } = req.body;
    const gameProcess = activeGames.get(gameId);

    if (!gameProcess) {
        return res.status(404).json({ error: "Game not found" });
    }

    try {
        // Send move to interactive judge
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
            clearTimeout(timeout); // Clear the timeout if we got a response
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

app.post("/end-game", (req, res) => {
    const { gameId } = req.body;
    const gameProcess = activeGames.get(gameId);

    if (gameProcess) {
        gameProcess.stdin.write("exit\n");
        gameProcess.kill();
        activeGames.delete(gameId);
    }

    res.json({ success: true });
});

// app.post("/api/update-bot-code", async (req, res) => {
//     try {
//         const { gameId, code } = req.body;
//         const gameProcess = activeGames.get(gameId);

//         if (!gameProcess) {
//             return res.status(404).json({ error: "Game not found" });
//         }

//         console.log("Updating bot code for game:", gameId);

//         // Create a temporary file for the new code
//         const tempFilePath = path.join(playingDir, `temp_${gameId}.cpp`);
//         const compiledPath = path.join(playingDir, `temp_${gameId}`);

//         try {
//             // Write the new code to a file
//             await fs.promises.writeFile(tempFilePath, code);
//             console.log("Code written to:", tempFilePath);

//             // Compile the new code
//             await compileCode(tempFilePath, compiledPath);
//             console.log("Code compiled successfully");

//             // Clean up old process
//             gameProcess.stdin.write("exit\n");
//             gameProcess.kill();
//             activeGames.delete(gameId);

//             // Start new process with updated code
//             const newGameProcess = spawn(
//                 "python3",
//                 [
//                     path.join(playingDir, "interactive_judge.py"),
//                     `temp_${gameId}`,
//                 ],
//                 {
//                     cwd: playingDir,
//                     stdio: ["pipe", "pipe", "pipe"],
//                 },
//             );

//             // Add error handling for process spawn
//             newGameProcess.on("error", (error) => {
//                 console.error("Failed to start new game process:", error);
//             });

//             // Debug logging
//             newGameProcess.stderr.on("data", (data) => {
//                 console.log("Interactive judge debug:", data.toString());
//             });

//             newGameProcess.stdout.on("data", (data) => {
//                 console.log("Interactive judge output:", data.toString());
//             });

//             // Store new process
//             activeGames.set(gameId, newGameProcess);

//             // Clean up temporary files
//             try {
//                 await fs.promises.unlink(tempFilePath);
//                 // Don't delete the compiled file as it's needed for the game
//             } catch (cleanupError) {
//                 console.error(
//                     "Error cleaning up temporary files:",
//                     cleanupError,
//                 );
//             }

//             res.json({ success: true });
//         } catch (compileError) {
//             console.error("Compilation error:", compileError);
//             // Clean up temporary files
//             try {
//                 await fs.promises.unlink(tempFilePath);
//                 await fs.promises.unlink(compiledPath);
//             } catch (cleanupError) {
//                 console.error(
//                     "Error cleaning up after failed compilation:",
//                     cleanupError,
//                 );
//             }
//             res.status(400).json({
//                 error: "Compilation failed",
//                 details: compileError.message,
//             });
//         }
//     } catch (error) {
//         console.error("Error updating bot code:", error);
//         res.status(500).json({
//             error: "Server error during code update",
//             details: error.message,
//         });
//     }
// });

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
app.post("/api/compile-code", async (req, res) => {
    try {
        const { nickname, code } = req.body;

        if (!nickname || !code) {
            return res.status(400).json({ error: "Nickname and code are required" });
        }

        console.log('Compiling code for:', nickname); // Debug log

        // Save code to file
        const filePath = path.join(playingDir, `${nickname}.cpp`);
        const compiledPath = path.join(playingDir, nickname);

        // Write the code to file
        await fs.promises.writeFile(filePath, code);
        console.log('Code written to:', filePath); // Debug log

        // Compile the code
        try {
            await compileCode(filePath, compiledPath);
            console.log('Compilation successful'); // Debug log
            res.json({ success: true });
        } catch (compileError) {
            console.error("Compilation error:", compileError);
            res.status(400).json({
                error: "Compilation failed: " + compileError.message
            });
        }
    } catch (error) {
        console.error("Error saving/compiling code:", error);
        res.status(500).json({ error: "Server error during compilation: " + error.message });
    }
});

// Get list of available opponents (programs in playing_programs directory)
app.get("/api/get-opponents", (req, res) => {
    try {
        const files = fs.readdirSync(playingDir);
        // Filter for .cpp files and remove .cpp extension
        const opponents = files
            .filter(file => file.endsWith('.cpp'))
            .map(file => file.replace('.cpp', ''));
        res.json({ opponents });
    } catch (error) {
        console.error("Error reading opponents:", error);
        res.status(500).json({ error: "Failed to get opponents list" });
    }
});

// Start a game between two bots
app.post("/api/start-bot-game", async (req, res) => {
    try {
        const { player1, player2 } = req.body;
        console.log(`Starting game between ${player1} and ${player2}`);

        if (!player1 || !player2) {
            return res.status(400).json({ error: "Both players are required" });
        }

        const gameProcess = spawn('python3',
            [path.join(playingDir, 'bot_interactive_judge.py'), player1, player2],
            {
                cwd: playingDir
            }
        );

        let outputData = '';

        gameProcess.stdout.on('data', (data) => {
            console.log("Received data from python:", data.toString());
            outputData += data.toString();
        });

        gameProcess.stderr.on('data', (data) => {
            console.log(`Debug: ${data.toString()}`);
        });

        gameProcess.on('close', (code) => {
            console.log("Game process closed with code:", code);
            console.log("Final output data:", outputData);

            try {
                const gameData = JSON.parse(outputData);
                res.json(gameData);
            } catch (error) {
                console.error('Error parsing game data:', error);
                res.status(500).json({
                    error: "Failed to parse game data",
                    rawOutput: outputData
                });
            }
        });

    } catch (error) {
        console.error("Error starting bot game:", error);
        res.status(500).json({ error: "Failed to start game" });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("Upload directory:", uploadDir);
});
