const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

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
        const judgePath = path.join(currentDir, 'playing_programs', 'judge.py');

        // Change working directory to where the agents are
        const command = `cd ${playingDir} && python3 ${judgePath}`;

        exec(command, async (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }

            try {
                // Copy moves.json to React's public directory
                const movesPath = path.join(playingDir, 'moves.json');
                const newMovesPath = path.join(__dirname, 'noughts-and-crosses-for-5', 'public', 'moves.json');

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("Upload directory:", uploadDir);
});
