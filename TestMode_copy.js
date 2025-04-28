import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Board from "./Board";
import CodeEditor from "./CodeEditor"; // Add this import

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
    const [gameEnded, setGameEnded] = useState(false);
    const [winningCells, setWinningCells] = useState([]);
    const [code, setCode] = useState(null);
    const [isCompiling, setIsCompiling] = useState(false);
    const [compilationError, setCompilationError] = useState(null);
    const [isCompiled, setIsCompiled] = useState(false);

    const handleCodeChange = (newCode) => {
        setCode(newCode);
    };

    const handleCompileClick = async () => {
        setIsCompiling(true);
        setCompilationError(null);

        try {
            const saveResponse = await fetch(
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

            if (!saveResponse.ok) {
                const errorData = await saveResponse.json();
                throw new Error(errorData.error || "Failed to compile code");
            }

            setIsCompiled(true); // Enable the play button
        } catch (error) {
            setCompilationError(error.message || "Failed to compile code");
        } finally {
            setIsCompiling(false);
        }
    };

    // const handlePlayClick = async () => {
    //     setIsCompiling(true);
    //     setCompilationError(null);

    //     try {
    //         // First, save and compile the user's code
    //         const saveResponse = await fetch(
    //             "http://localhost:4000/api/update-bot-code",
    //             {
    //                 method: "POST",
    //                 headers: {
    //                     "Content-Type": "application/json",
    //                 },
    //                 body: JSON.stringify({
    //                     nickname,
    //                     code,
    //                 }),
    //             },
    //         );

    //         if (!saveResponse.ok) {
    //             const errorData = await saveResponse.json();
    //             throw new Error(errorData.error || "Failed to save code");
    //         }

    //         // Then start a new game session
    //         const gameResponse = await fetch(
    //             "http://localhost:4000/start-interactive-game",
    //             {
    //                 method: "POST",
    //                 headers: {
    //                     "Content-Type": "application/json",
    //                 },
    //                 body: JSON.stringify({
    //                     nickname,
    //                 }),
    //             },
    //         );

    //         const gameData = await gameResponse.json();
    //         if (!gameData.success) {
    //             throw new Error(gameData.error || "Failed to start game");
    //         }

    //         setGameId(gameData.gameId);

    //         // Reset the game board
    //         setBoard(
    //             Array(10)
    //                 .fill()
    //                 .map(() => Array(10).fill(" ")),
    //         );
    //         setIsPlayerTurn(true);
    //         setWinner(null);
    //         setGameEnded(false);
    //         setWinningCells([]);
    //     } catch (error) {
    //         setCompilationError(
    //             error.message || "Failed to compile and start the game",
    //         );
    //     } finally {
    //         setIsCompiling(false);
    //     }
    // };

    const handlePlayClick = async () => {
        try {
            const gameResponse = await fetch(
                "http://localhost:4000/start-interactive-game",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        nickname,
                    }),
                },
            );

            const gameData = await gameResponse.json();
            if (!gameData.success) {
                throw new Error(gameData.error || "Failed to start game");
            }

            setGameId(gameData.gameId);
            setBoard(
                Array(10)
                    .fill()
                    .map(() => Array(10).fill(" ")),
            );
            setIsPlayerTurn(true);
            setWinner(null);
            setGameEnded(false);
            setWinningCells([]);
        } catch (error) {
            setCompilationError(error.message || "Failed to start the game");
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

    // First useEffect for game initialization
    // useEffect(() => {
    //     // if (!nickname || !opponent) {
    //     //     console.log("Missing nickname or opponent, redirecting to login");
    //     //     navigate("/login");
    //     //     return;
    //     // }

    //     console.log("Starting interactive game with:", { nickname, opponent });

    //     // Initialize interactive game
    //     fetch("http://localhost:4000/start-interactive-game", {
    //         method: "POST",
    //         headers: {
    //             "Content-Type": "application/json",
    //         },
    //         body: JSON.stringify({ nickname, opponent }),
    //     })
    //         .then((response) => {
    //             console.log("Got response:", response);
    //             return response.json();
    //         })
    //         .then((data) => {
    //             console.log("Game started with data:", data);
    //             if (data.success) {
    //                 setGameId(data.gameId);
    //             }
    //         })
    //         .catch((error) => {
    //             console.error("Error starting game:", error);
    //             alert("Failed to start game");
    //             navigate("/login");
    //         });
    // }, [nickname, opponent, navigate]);

    // Second useEffect for cleanup
    // useEffect(() => {
    //     // Cleanup function
    //     return () => {
    //         if (gameId) {
    //             fetch("http://localhost:4000/end-game", {
    //                 method: "POST",
    //                 headers: {
    //                     "Content-Type": "application/json",
    //                 },
    //                 body: JSON.stringify({ gameId }),
    //             });
    //         }
    //     };
    // }, [gameId]); // Add gameId to dependency array

    const handleCellClick = async (x, y) => {
        if (!isPlayerTurn || board[x][y] !== " " || !gameId || gameEnded)
            return;

        setIsPlayerTurn(false);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout

            const response = await fetch("http://localhost:4000/make-move", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ gameId, x, y }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const botMove = await response.json();

            if (botMove.error) {
                console.error("Move error:", botMove.error);
                // Reset game state
                setIsPlayerTurn(true);
                if (botMove.error === "Move timeout") {
                    alert("Game timed out. Please start a new game.");
                    navigate("/login");
                }
                return;
            }

            setBoard((prev) => {
                const newBoard = prev.map((row) => [...row]);
                newBoard[x][y] = "O";
                if (botMove.x >= 0 && botMove.y >= 0) {
                    newBoard[botMove.x][botMove.y] = "X";
                }
                return newBoard;
            });

            if (botMove.winner) {
                setWinner(botMove.winner);
                setGameEnded(true);
                if (botMove.winning_cells) {
                    setWinningCells(botMove.winning_cells);
                }
                await fetch("http://localhost:4000/end-game", {
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
            if (error.name === "AbortError") {
                alert("Move timed out. Please try again or start a new game.");
            }
            // Reset game state
            setIsPlayerTurn(true);
        }
    };

    // useEffect(() => {
    //     if (!nickname) {
    //         navigate("/");
    //         return;
    //     }

    //     const initializeGame = async () => {
    //         try {
    //             const response = await fetch(
    //                 "http://localhost:4000/start-interactive-game",
    //                 {
    //                     method: "POST",
    //                     headers: {
    //                         "Content-Type": "application/json",
    //                     },
    //                     body: JSON.stringify({
    //                         nickname,
    //                         botFileName: "random", // Provide a default bot file name
    //                     }),
    //                 },
    //             );

    //             const data = await response.json();
    //             if (data.success) {
    //                 setGameId(data.gameId);
    //             } else {
    //                 throw new Error(data.error || "Failed to initialize game");
    //             }
    //         } catch (error) {
    //             console.error("Error initializing game:", error);
    //             setCompilationError("Failed to initialize game");
    //         }
    //     };

    //     initializeGame();
    // }, [nickname, navigate]);

    //     return (
    //         <div>
    //             <h2 style={{ textAlign: "center", fontFamily: "monospace" }}>
    //                 test mode
    //             </h2>
    //             <h3 style={{ textAlign: "center", fontFamily: "monospace" }}>
    //                 playing against {opponent}
    //             </h3>

    //             <div
    //                 style={{
    //                     display: "flex",
    //                     justifyContent: "space-around",
    //                     marginBottom: "20px",
    //                 }}
    //             >
    //                 <div style={{ fontFamily: "monospace" }}>{nickname} (O)</div>
    //                 <div style={{ fontFamily: "monospace" }}>{opponent} (X)</div>
    //             </div>
    //             {winner && (
    //                 <div
    //                     style={{
    //                         textAlign: "center",
    //                         fontFamily: "monospace",
    //                         fontSize: "1.2em",
    //                         fontWeight: "bold",
    //                         color: winner === "O" ? "#4CAF50" : "#f44336",
    //                         marginBottom: "20px",
    //                     }}
    //                 >
    //                     {winner === "O" ? "you win!" : "you lose!"}
    //                 </div>
    //             )}
    //             <Board
    //                 board={board}
    //                 onCellClick={handleCellClick}
    //                 interactive={true}
    //                 winningCells={winningCells}
    //             />
    //             {!isPlayerTurn && !gameEnded && (
    //                 <div
    //                     style={{
    //                         textAlign: "center",
    //                         fontFamily: "monospace",
    //                         marginTop: "20px",
    //                     }}
    //                 >
    //                     waiting for opponent...
    //                 </div>
    //             )}
    //             {gameEnded && (
    //                 <button
    //                     onClick={() => navigate("/login")}
    //                     style={{
    //                         display: "block",
    //                         margin: "20px auto",
    //                         padding: "10px 20px",
    //                         fontFamily: "monospace",
    //                         cursor: "pointer",
    //                     }}
    //                 >
    //                     play again
    //                 </button>
    //             )}
    //         </div>
    //     );
    // }

    return (
        <div>
            <h2 style={{ textAlign: "center", fontFamily: "monospace" }}>
                test mode
            </h2>
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
                        style={{ textAlign: "center", fontFamily: "monospace" }}
                    >
                        {/* playing against {opponent} */}
                    </h3>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-around",
                            marginBottom: "20px",
                        }}
                    >
                        <div style={{ fontFamily: "monospace" }}>you (O)</div>
                        <div style={{ fontFamily: "monospace" }}>bot (X)</div>
                    </div>
                    {winner && (
                        <div
                            style={{
                                textAlign: "center",
                                fontFamily: "monospace",
                                fontSize: "1.2em",
                                fontWeight: "bold",
                                color: winner === "O" ? "#4CAF50" : "#f44336",
                                marginBottom: "20px",
                            }}
                        >
                            {winner === "O" ? "you win!" : "you lose!"}
                        </div>
                    )}
                    <Board
                        board={board}
                        onCellClick={handleCellClick}
                        interactive={true}
                        winningCells={winningCells}
                    />
                    {!isPlayerTurn && !gameEnded && (
                        <div
                            style={{
                                textAlign: "center",
                                fontFamily: "monospace",
                                marginTop: "20px",
                            }}
                        >
                            waiting for opponent...
                        </div>
                    )}
                </div>

                {/* Right side: Code Editor */}
                {/* <div style={{ flex: 1 }}>
                    <CodeEditor code={code} onChange={handleCodeChange} />
                </div> */}

                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <CodeEditor code={code} onChange={handleCodeChange} />
                    {/* <div style={{ marginTop: "20px", textAlign: "center" }}>
                        <button
                            onClick={handlePlayClick}
                            disabled={isCompiling || !gameId}
                            style={{
                                padding: "10px 20px",
                                fontFamily: "monospace",
                                cursor: isCompiling ? "wait" : "pointer",
                            }}
                        >
                            {isCompiling ? "Compiling..." : "Play"}
                        </button>

                        {compilationError && (
                            <div
                                style={{
                                    color: "red",
                                    marginTop: "10px",
                                    fontFamily: "monospace",
                                }}
                            >
                                {compilationError}
                            </div>
                        )}

                        {gameEnded && (
                            <button
                                onClick={() => navigate("/welcome")}
                                style={{
                                    // display: "block",
                                    margin: "20px auto",
                                    padding: "10px 20px",
                                    fontFamily: "monospace",
                                    cursor: "pointer",
                                }}
                            >
                                play again
                            </button>
                        )}
                    </div> */}
                    <div>
                        <button
                            onClick={handleCompileClick}
                            disabled={isCompiling}
                            style={{
                                padding: "10px 20px",
                                fontFamily: "monospace",
                                cursor: isCompiling ? "wait" : "pointer",
                                marginRight: "10px",
                            }}
                        >
                            {isCompiling ? "Compiling..." : "Compile"}
                        </button>

                        <button
                            onClick={handlePlayClick}
                            disabled={!isCompiled || !gameId}
                            style={{
                                padding: "10px 20px",
                                fontFamily: "monospace",
                                cursor: !isCompiled ? "not-allowed" : "pointer",
                            }}
                        >
                            Play
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TestMode;
