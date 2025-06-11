import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Board from "./Board";
import CodeEditor from "./CodeEditor";
import "./TestMode.css";
import { API_URL } from "./config";

const N = 15;

function TestMode() {
    const location = useLocation();
    const navigate = useNavigate();
    const [board, setBoard] = useState(
        Array(N)
            .fill()
            .map(() => Array(N).fill(" ")),
    );

    const [gameId, setGameId] = useState(null);
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const { nickname, opponent } = location.state || {};
    const [winner, setWinner] = useState(null);
    const [gameEnded, setGameEnded] = useState(null);
    const [winningCells, setWinningCells] = useState([]);
    const [code, setCode] = useState(null);
    const [isCompiling, setIsCompiling] = useState(false);
    const [compilationError, setCompilationError] = useState(null);
    const [isCompiled, setIsCompiled] = useState(false);
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [otherPiece, setOtherPiece] = useState(null);
    const [piecesAssigned, setPiecesAssigned] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const handleDrawPieces = () => {
        const pieces = ["O", "X"];
        const randomIndex = Math.floor(Math.random() * pieces.length);
        setSelectedPiece(pieces[randomIndex]);
        setOtherPiece(pieces[1 - randomIndex]);
        setPiecesAssigned(true);
    };

    const handleCodeChange = (newCode) => {
        setCode(newCode);
        setIsSaved(false);
    };

    const handleCompileClick = async () => {
        setIsCompiling(true);
        setCompilationError(null);

        try {
            const response = await fetch(
                `${API_URL}/api/compile-code`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: localStorage.getItem("token"),
                    },
                    body: JSON.stringify({
                        nickname,
                        code,
                        localStorage,
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
            Array(N)
                .fill()
                .map(() => Array(N).fill(" ")),
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
            console.log("Starting game with piece:", selectedPiece); // Debug log

            const response = await fetch(
                `${API_URL}/api/start-interactive-game`,
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
                Array(N)
                    .fill()
                    .map(() => Array(N).fill(" ")),
            );
            setWinner(null);
            setGameEnded(false);
            setWinningCells([]);

            // Important: Set initial turn state based on piece selection
            if (selectedPiece === "O") {
                console.log("Player is O, setting player's turn"); // Debug log
                setIsPlayerTurn(true);
            } else {
                console.log("Player is X, waiting for bot's move"); // Debug log
                setIsPlayerTurn(false);

                // Get bot's first move
                const initialMoveResponse = await fetch(
                    `${API_URL}/api/make-move`,
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
                console.log("Received initial move:", initialMove); // Debug log

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
            fetch(`${API_URL}/api/get-code/${nickname}`)
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
        console.log("Cell clicked:", { x, y, isPlayerTurn, gameId, gameEnded }); // Debug log

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
                `${API_URL}/api/make-move`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ gameId, x, y }),
                },
            );

            const botMove = await response.json();
            console.log("Received bot move:", botMove); // Debug log

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
                await fetch(`${API_URL}/api/end-game`, {
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

    const handleSaveClick = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(
                `${API_URL}/api/compile-code`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: localStorage.getItem("token"),
                    },
                    body: JSON.stringify({
                        nickname,
                        code,
                        saveOnly: true,
                    }),
                },
            );

            if (response.ok) {
                console.log("Code saved successfully");
                setIsSaved(true); // Mark as saved
            } else {
                const data = await response.json();
                throw new Error(data.error || "Failed to save code");
            }
        } catch (error) {
            console.error("Error saving code:", error);
            alert("Błąd podczas zapisywania kodu: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <div
                style={{
                    display: "flex",
                    gap: "20px",
                    padding: "20px",
                }}
            >
                {/* Left side: Game Board */}
                <div style={{ flex: 1 }}>
                    <h3
                        style={{
                            textAlign: "center",
                            fontFamily: "monospace",
                            marginBottom: "10px",
                        }}
                    >
                        {nickname}
                    </h3>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-around",
                            marginBottom: "20px",
                        }}
                    >
                        <div style={{ fontFamily: "monospace" }}>
                            {piecesAssigned
                                ? `mysz (${selectedPiece})`
                                : "mysz"}
                        </div>
                        <div style={{ fontFamily: "monospace" }}>
                            {piecesAssigned ? `kod (${otherPiece})` : "kod"}
                        </div>
                    </div>
                    <Board
                        board={board}
                        onCellClick={handleCellClick}
                        interactive={true}
                        winningCells={winningCells}
                    />
                    {/* Draw pieces button */}
                    {/* {!piecesAssigned && ( */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            marginBottom: "20px",
                            gap: "20px",
                        }}
                    >
                        <button
                            onClick={handleDrawPieces}
                            disabled={gameEnded}
                            style={{
                                padding: "5px 10px",
                                fontFamily: "monospace",
                                cursor: "pointer",
                            }}
                        >
                            wylosuj kto zaczyna
                        </button>
                        <button
                            onClick={handlePlayClick}
                            disabled={
                                !isCompiled || !piecesAssigned || gameEnded
                            }
                            style={{
                                padding: "5px 10px",
                                fontFamily: "monospace",
                                cursor:
                                    !isCompiled || !piecesAssigned
                                        ? "not-allowed"
                                        : "pointer",
                            }}
                        >
                            graj
                        </button>
                        {gameEnded && (
                            <button onClick={handleRestart}>jeszcze raz</button>
                        )}
                    </div>
                    {/* Compilation error display */}
                    {compilationError && (
                        <div
                            style={{
                                marginTop: "20px",
                                padding: "10px",
                                backgroundColor: "#ffebee",
                                border: "1px solid #ffcdd2",
                                borderRadius: "4px",
                                fontFamily: "monospace",
                                whiteSpace: "pre-wrap",
                                overflowX: "auto",
                                maxHeight: "6em", // This will accommodate approximately 6 lines (1.4em per line)
                                overflowY: "auto", // This adds vertical scrollbar when needed
                            }}
                        >
                            <div
                                style={{
                                    color: "#d32f2f",
                                    marginBottom: "5px",
                                }}
                            >
                                Błąd kompilacji:
                            </div>
                            <code
                                style={{
                                    color: "#555",
                                    display: "block", // This ensures proper scrolling
                                }}
                            >
                                {compilationError}
                            </code>
                        </div>
                    )}
                </div>

                {/* Right side: Code Editor */}
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        height: "100%", // Set a taller height based on viewport
                    }}
                >
                    <div
                        style={{
                            flex: 1, // Make it use all available space
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            overflow: "hidden",
                            marginBottom: "15px", // Space for buttons
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        <CodeEditor code={code} onChange={handleCodeChange} />
                    </div>

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center", // Center the buttons
                            marginTop: "15px", // Add some space between editor and buttons
                            // gap: "10px"
                        }}
                    >
                        <button
                            onClick={handleSaveClick}
                            disabled={isSaving || isSaved}
                            style={{
                                padding: "8px 16px",
                                fontFamily: "monospace",
                                cursor: isSaved ? "default" : "pointer",
                                backgroundColor: "#FF69B4",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                marginRight: "20px",
                                opacity: isSaved ? 0.8 : 1,
                            }}
                        >
                            {isSaving
                                ? "zapisywanie..."
                                : isSaved
                                  ? "zapisano"
                                  : "zapisz"}
                        </button>

                        <button
                            onClick={handleCompileClick}
                            disabled={isCompiling}
                            style={{
                                padding: "8px 16px",
                                fontFamily: "monospace",
                                cursor: isCompiling ? "wait" : "pointer",
                                backgroundColor: "#FF69B4", // Pink for compile
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                            }}
                        >
                            {isCompiling ? "kompilacja..." : "kompiluj"}
                        </button>

                        {/* <button
                            onClick={() => {
                                const element = document.createElement("a");
                                const file = new Blob([code], {
                                    type: "text/plain",
                                });
                                element.href = URL.createObjectURL(file);
                                element.download = `${nickname}.cpp`;
                                document.body.appendChild(element);
                                element.click();
                                document.body.removeChild(element);
                            }}
                            style={{
                                padding: "8px 16px",
                                fontFamily: "monospace",
                                cursor: "pointer",
                                backgroundColor: "#f0f0f0",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                marginLeft: "10px", // Add some space between buttons
                            }}
                        >
                            pobierz kod
                        </button> */}
                    </div>
                </div>

                {/* Back button */}
                {/* <button
                onClick={() =>
                    navigate("/welcome", {
                        state: { returnedNickname: nickname },
                    })
                }
                style={{
                    position: "fixed",
                    left: "80px",
                    bottom: "20px",
                    padding: "5px 10px",
                    fontFamily: "monospace",
                    cursor: "pointer",
                }}
            >
                powrót
            </button> */}
            </div>
        </div>
    );
}

export default TestMode;
