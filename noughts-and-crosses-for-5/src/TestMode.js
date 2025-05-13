import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Board from "./Board";
import CodeEditor from "./CodeEditor";
import "./TestMode.css";

function TestMode() {
    const location = useLocation();
    const navigate = useNavigate();
    const [board, setBoard] = useState(
        Array(10)
            .fill()
            .map(() => Array(10).fill(" ")),
    );
    const [gameId, setGameId] = useState(null);
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const { nickname, opponent } = location.state || {};
    const [winner, setWinner] = useState(null);
    const [gameEnded, setGameEnded] = useState(null);
    const [winningCells, setWinningCells] = useState([]);
    const [code, setCode] = useState(null);
    const [isCompiling, setIsCompiling] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [compilationError, setCompilationError] = useState(null);
    const [isCompiled, setIsCompiled] = useState(false);
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [otherPiece, setOtherPiece] = useState(null);
    const [piecesAssigned, setPiecesAssigned] = useState(false);

    const handleDrawPieces = () => {
        const pieces = ["O", "X"];
        const randomIndex = Math.floor(Math.random() * pieces.length);
        setSelectedPiece(pieces[randomIndex]);
        setOtherPiece(pieces[1 - randomIndex]);
        setPiecesAssigned(true);
    };

    const handleCodeChange = (newCode) => {
        setCode(newCode);
    };

    const handleSaveClick = async () => {
        if (!code) return;

        setIsSaving(true);
        setCompilationError(null);

        try {
            const response = await fetch(
                "http://localhost:4000/api/compile-code",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        nickname,
                        code,
                        compile: false
                    }),
                },
            );

            const data = await response.json();

            if (response.ok) {
                console.log("Code saved successfully");
            } else {
                throw new Error(data.error || "Failed to save code");
            }
        } catch (error) {
            console.error("Save error:", error);
            setCompilationError("Błąd zapisu: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCompileClick = async () => {
        if (!code) return;

        setIsCompiling(true);
        setCompilationError(null);

        try {
            const response = await fetch(
                "http://localhost:4000/api/compile-code",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        nickname,
                        code,
                    }),
                },
            );

            const data = await response.json();

            if (response.ok) {
                setIsCompiled(true);
                console.log("Compilation successful");
            } else {
                throw new Error(data.error || "Compilation failed");
            }
        } catch (error) {
            console.error("Compilation error:", error);
            setCompilationError(error.message);
            setIsCompiled(false);
        } finally {
            setIsCompiling(false);
        }
    };

    const handleRestart = () => {
        // Reset all game-related states
        setBoard(
            Array(10)
                .fill()
                .map(() => Array(10).fill(" ")),
        );
        setGameId(null);
        setWinner(null);
        setGameEnded(null);
        setWinningCells([]);
        setSelectedPiece(null);
        setOtherPiece(null);
        setPiecesAssigned(false);
        setIsPlayerTurn(true);
    };

    const handlePlayClick = async () => {
        if (!isCompiled || !piecesAssigned) return;

        try {
            console.log("Starting game with piece:", selectedPiece);

            const response = await fetch(
                "http://localhost:4000/api/start-interactive-game",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        nickname,
                        selectedPiece,
                    }),
                },
            );

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || "Failed to start game");
            }

            setGameId(data.gameId);
            setBoard(
                Array(10)
                    .fill()
                    .map(() => Array(10).fill(" ")),
            );
            setWinner(null);
            setGameEnded(false);
            setWinningCells([]);

            // Important: Set initial turn state based on piece selection
            if (selectedPiece === "O") {
                console.log("Player is O, setting player's turn");
                setIsPlayerTurn(true);
            } else {
                console.log("Player is X, waiting for bot's move");
                setIsPlayerTurn(false);

                // Get bot's first move
                const initialMoveResponse = await fetch(
                    "http://localhost:4000/api/make-move",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            gameId: data.gameId,
                            x: -1,
                            y: -1,
                        }),
                    },
                );

                const initialMove = await initialMoveResponse.json();
                console.log("Received initial move:", initialMove);

                if (initialMove.error) {
                    throw new Error(initialMove.error);
                }

                if (initialMove.x >= 0 && initialMove.y >= 0) {
                    setBoard((prev) => {
                        const newBoard = prev.map((row) => [...row]);
                        newBoard[initialMove.x][initialMove.y] = "O";
                        return newBoard;
                    });
                    setIsPlayerTurn(true); // Now it's player's turn
                }
            }
        } catch (error) {
            console.error("Error starting game:", error);
            alert(`Failed to start game: ${error.message}`);
        }
    };

    useEffect(() => {
        if (nickname) {
            fetch(`http://localhost:4000/api/get-code/${nickname}`)
                .then((response) => response.json())
                .then((data) => {
                    if (data.code) {
                        setCode(data.code);
                    }
                })
                .catch((error) => console.error("Error loading code:", error));
        }
    }, [nickname]);

    const handleCellClick = async (x, y) => {
        console.log("Cell clicked:", { x, y, isPlayerTurn, gameId, gameEnded });

        if (!isPlayerTurn || board[x][y] !== " " || !gameId || gameEnded) {
            console.log("Click ignored due to:", {
                notPlayerTurn: !isPlayerTurn,
                cellNotEmpty: board[x][y] !== " ",
                noGameId: !gameId,
                gameEnded: gameEnded,
            });
            return;
        }

        setIsPlayerTurn(false);

        try {
            const response = await fetch(
                "http://localhost:4000/api/make-move",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ gameId, x, y }),
                },
            );

            const botMove = await response.json();
            console.log("Received bot move:", botMove);

            if (botMove.error) {
                console.error("Move error:", botMove.error);
                setIsPlayerTurn(true);
                if (botMove.error === "Move timeout") {
                    alert("Game timed out. Please start a new game.");
                    navigate("/welcome");
                }
                return;
            }

            setBoard((prev) => {
                const newBoard = prev.map((row) => [...row]);
                newBoard[x][y] = selectedPiece;
                if (botMove.x >= 0 && botMove.y >= 0) {
                    newBoard[botMove.x][botMove.y] =
                        selectedPiece === "O" ? "X" : "O";
                }
                return newBoard;
            });

            if (botMove.winner) {
                setWinner(botMove.winner);
                setGameEnded(true);
                if (botMove.winning_cells) {
                    setWinningCells(botMove.winning_cells);
                }
                await fetch("http://localhost:4000/api/end-game", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ gameId }),
                });
            } else {
                setIsPlayerTurn(true);
            }
        } catch (error) {
            console.error("Error making move:", error);
            setIsPlayerTurn(true);
        }
    };

    return (
        <div className="test-mode-container">
            {/* Game Board Side */}
            <div className="board-section">
                <h3 className="player-name">{nickname}</h3>
                <div className="players-info">
                    <div className="player-label">
                        {piecesAssigned ? `mysz (${selectedPiece})` : "mysz"}
                    </div>
                    <div className="player-label">
                        {piecesAssigned
                            ? `Twój program (${otherPiece})`
                            : "Twój program"}
                    </div>
                </div>

                <div className="board-wrapper">
                    <Board
                        board={board}
                        onCellClick={handleCellClick}
                        interactive={true}
                        winningCells={winningCells}
                    />
                </div>

                <div className="game-controls">
                    <button
                        onClick={handleDrawPieces}
                        disabled={gameEnded}
                        className="game-button"
                    >
                        wylosuj kto zaczyna
                    </button>
                    <button
                        onClick={handlePlayClick}
                        disabled={
                            !isCompiled || !piecesAssigned || gameEnded
                        }
                        className={`game-button ${(!isCompiled || !piecesAssigned) ? 'disabled' : ''}`}
                    >
                        graj
                    </button>
                    {gameEnded && (
                        <button onClick={handleRestart} className="game-button">jeszcze raz</button>
                    )}
                </div>

                {/* Compilation error display */}
                {compilationError && (
                    <div className="error-container">
                        <div className="error-title">Błąd kompilacji:</div>
                        <code className="error-message">{compilationError}</code>
                    </div>
                )}
            </div>

            {/* Code Editor Side */}
            <div className="editor-section">
                <div className="editor-wrapper">
                    <CodeEditor code={code} onChange={handleCodeChange} />
                </div>

                <div className="editor-controls">
                    <button
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        className="editor-button save-button"
                    >
                        {isSaving ? "zapisywanie..." : "💾 zapisz"}
                    </button>

                    <button
                        onClick={handleCompileClick}
                        disabled={isCompiling}
                        className="editor-button compile-button"
                    >
                        {isCompiling ? "kompilacja..." : "🔨 kompiluj"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TestMode;
