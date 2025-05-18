import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Board from "./Board";
import CodeEditor from "./CodeEditor";
// import HelpPanel from "./HelpPanel";
// import "./BackButton.css";
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

    const handleCompileClick = async () => {
        setIsCompiling(true);
        setCompilationError(null);

        try {
            const response = await fetch(
                "http://localhost:4000/api/compile-code",
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

    // const handlePlayClick = async () => {
    //     if (!isCompiled) return;

    //     try {
    //         const response = await fetch(
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

    //         const data = await response.json();
    //         if (!data.success) {
    //             throw new Error(data.error || "Failed to start game");
    //         }

    //         setGameId(data.gameId);
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
    //         console.error("Error starting game:", error);
    //         setCompilationError(error.message || "Failed to start the game");
    //     }
    // };

    const handlePlayClick = async () => {
        if (!isCompiled || !piecesAssigned) return;

        try {
            console.log("Starting game with piece:", selectedPiece); // Debug log

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
                console.log("Player is O, setting player's turn"); // Debug log
                setIsPlayerTurn(true);
            } else {
                console.log("Player is X, waiting for bot's move"); // Debug log
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

    // const handleCellClick = async (x, y) => {
    //     if (!isPlayerTurn || board[x][y] !== " " || !gameId || gameEnded)
    //         return;

    //     setIsPlayerTurn(false);

    //     try {
    //         const controller = new AbortController();
    //         const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout

    //         const response = await fetch("http://localhost:4000/make-move", {
    //             method: "POST",
    //             headers: {
    //                 "Content-Type": "application/json",
    //             },
    //             body: JSON.stringify({ gameId, x, y }),
    //             signal: controller.signal,
    //         });

    //         clearTimeout(timeoutId);

    //         const botMove = await response.json();

    //         if (botMove.error) {
    //             console.error("Move error:", botMove.error);
    //             // Reset game state
    //             setIsPlayerTurn(true);
    //             if (botMove.error === "Move timeout") {
    //                 alert("Game timed out. Please start a new game.");
    //                 navigate("/login");
    //             }
    //             return;
    //         }

    //         setBoard((prev) => {
    //             const newBoard = prev.map((row) => [...row]);
    //             newBoard[x][y] = "O";
    //             if (botMove.x >= 0 && botMove.y >= 0) {
    //                 newBoard[botMove.x][botMove.y] = "X";
    //             }
    //             return newBoard;
    //         });

    //         if (botMove.winner) {
    //             setWinner(botMove.winner);
    //             setGameEnded(true);
    //             if (botMove.winning_cells) {
    //                 setWinningCells(botMove.winning_cells);
    //             }
    //             await fetch("http://localhost:4000/end-game", {
    //                 method: "POST",
    //                 headers: {
    //                     "Content-Type": "application/json",
    //                 },
    //                 body: JSON.stringify({ gameId }),
    //             });
    //         } else {
    //             setIsPlayerTurn(true);
    //         }
    //     } catch (error) {
    //         console.error("Error making move:", error);
    //         if (error.name === "AbortError") {
    //             alert("Move timed out. Please try again or start a new game.");
    //         }
    //         // Reset game state
    //         setIsPlayerTurn(true);
    //     }
    // };

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

    // return (
    //     <div>
    //         <h2 style={{ textAlign: "center", fontFamily: "monospace" }}>
    //             trening
    //         </h2>
    //         <div
    //             style={{
    //                 display: "flex",
    //                 gap: "20px",
    //                 padding: "20px",
    //             }}
    //         >
    //             {/* Left side: Game Board */}
    //             <div style={{ flex: 1 }}>
    //                 <h3
    //                     style={{ textAlign: "center", fontFamily: "monospace" }}
    //                 >
    //                     {/* playing against {opponent} */}
    //                 </h3>
    //                 <div
    //                     style={{
    //                         display: "flex",
    //                         justifyContent: "space-around",
    //                         marginBottom: "20px",
    //                     }}
    //                 >
    //                     <div style={{ fontFamily: "monospace" }}>Ty (O)</div>
    //                     <div style={{ fontFamily: "monospace" }}>
    //                         Twój program (X)
    //                     </div>
    //                 </div>
    //                 {/* {winner && (
    //                     <div
    //                         style={{
    //                             textAlign: "center",
    //                             fontFamily: "monospace",
    //                             fontSize: "1.2em",
    //                             fontWeight: "bold",
    //                             color: winner === "O" ? "#4CAF50" : "#f44336",
    //                             marginBottom: "20px",
    //                         }}
    //                     >
    //                         {winner === "O"
    //                             ? "wygrałeś z botem"
    //                             : "bot wygrał!"}
    //                     </div>
    //                 )} */}
    //                 <Board
    //                     board={board}
    //                     onCellClick={handleCellClick}
    //                     interactive={true}
    //                     winningCells={winningCells}
    //                 />
    //                 {!isPlayerTurn && !gameEnded && (
    //                     <div
    //                         style={{
    //                             textAlign: "center",
    //                             fontFamily: "monospace",
    //                             marginTop: "20px",
    //                         }}
    //                     >
    //                         oczekiwanie na ruch bota...
    //                     </div>
    //                 )}
    //             </div>

    //             {/* Right side: Code Editor */}
    //             {/* <div style={{ flex: 1 }}>
    //                 <CodeEditor code={code} onChange={handleCodeChange} />
    //             </div> */}

    //             <div
    //                 style={{
    //                     flex: 1,
    //                     display: "flex",
    //                     flexDirection: "column",
    //                 }}
    //             >
    //                 <CodeEditor code={code} onChange={handleCodeChange} />
    //                 {/* <div style={{ marginTop: "20px", textAlign: "center" }}>
    //                     <button
    //                         onClick={handlePlayClick}
    //                         disabled={isCompiling || !gameId}
    //                         style={{
    //                             padding: "10px 20px",
    //                             fontFamily: "monospace",
    //                             cursor: isCompiling ? "wait" : "pointer",
    //                         }}
    //                     >
    //                         {isCompiling ? "Compiling..." : "Play"}
    //                     </button>

    //                     {compilationError && (
    //                         <div
    //                             style={{
    //                                 color: "red",
    //                                 marginTop: "10px",
    //                                 fontFamily: "monospace",
    //                             }}
    //                         >
    //                             {compilationError}
    //                         </div>
    //                     )}

    //                     {gameEnded && (
    //                         <button
    //                             onClick={() => navigate("/welcome")}
    //                             style={{
    //                                 // display: "block",
    //                                 margin: "20px auto",
    //                                 padding: "10px 20px",
    //                                 fontFamily: "monospace",
    //                                 cursor: "pointer",
    //                             }}
    //                         >
    //                             play again
    //                         </button>
    //                     )}
    //                 </div> */}
    //                 <div
    //                     style={{
    //                         display: "flex",
    //                         gap: "10px",
    //                         marginTop: "10px",
    //                     }}
    //                 >
    //                     <button
    //                         onClick={handleCompileClick}
    //                         disabled={isCompiling}
    //                         style={{
    //                             padding: "5px 10px",
    //                             fontFamily: "monospace",
    //                             cursor: isCompiling ? "wait" : "pointer",
    //                         }}
    //                     >
    //                         {isCompiling ? "kompilacja..." : "zapisz"}
    //                     </button>

    //                     <button
    //                         onClick={handlePlayClick}
    //                         disabled={!isCompiled}
    //                         style={{
    //                             padding: "5px 10px",
    //                             fontFamily: "monospace",
    //                             cursor: !isCompiled ? "not-allowed" : "pointer",
    //                         }}
    //                     >
    //                         graj
    //                     </button>

    //                     <button
    //                         onClick={() => {
    //                             const element = document.createElement("a");
    //                             const file = new Blob([code], {
    //                                 type: "text/plain",
    //                             });
    //                             element.href = URL.createObjectURL(file);
    //                             element.download = `${nickname}.cpp`;
    //                             document.body.appendChild(element);
    //                             element.click();
    //                             document.body.removeChild(element);
    //                         }}
    //                         style={{
    //                             padding: "5px 10px",
    //                             fontFamily: "monospace",
    //                             cursor: "pointer",
    //                         }}
    //                     >
    //                         pobierz kod
    //                     </button>
    //                 </div>
    //             </div>
    //         </div>
    //         <div
    //             style={{
    //                 position: "fixed",
    //                 bottom: "20px",
    //                 left: "20px",
    //             }}
    //         ></div>
    //         <HelpPanel
    //             content={
    //                 <div>
    //                     <p>
    //                         to jest miejsce w którym możesz pisać i testować
    //                         swój program.
    //                     </p>
    //                     <p>
    //                         kod po prawej opisuje bota robiącego losowe ruchy.
    //                         spróbuj zastąpić procedurę `random_move` własną,
    //                         sprytniejszą.
    //                     </p>
    //                     <p>
    //                         WEJŚCIE:
    //                         <ul>
    //                             <li>
    //                                 {" "}
    //                                 jeśli program gra jako 'O' (rozpoczyna grę),
    //                                 na wejściu dostaje wiadomość 'start''{" "}
    //                             </li>
    //                             <li>
    //                                 {" "}
    //                                 jeśli program gra jako 'X' (czeka na ruch
    //                                 przeciwnika), na wejściu dostaje dwie liczby
    //                                 oddzielone spacją: 'x y' (współrzędne ruchu
    //                                 przeciwnika)
    //                             </li>
    //                         </ul>
    //                     </p>
    //                 </div>
    //             }
    //         />
    //         <button
    //             onClick={() =>
    //                 navigate("/welcome", {
    //                     state: { returnedNickname: nickname },
    //                 })
    //             }
    //             style={{
    //                         position: "fixed",
    //                         left: "80px",  // This puts it to the right of the collapsed help panel
    //                         bottom: "20px",
    //                         padding: "5px 10px",
    //                         fontFamily: "monospace",
    //                         cursor: "pointer",
    //                     }}
    //         >
    //             powrót
    //         </button>
    //     </div>
    // );

    const handleSaveClick = async () => {
        try {
            // We'll use the compile endpoint but add a flag to indicate we're just saving
            const response = await fetch(
                "http://localhost:4000/api/compile-code",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: localStorage.getItem("token"),
                    },
                    body: JSON.stringify({
                        nickname,
                        code,
                        saveOnly: true, // Add this flag
                    }),
                },
            );

            if (response.ok) {
                console.log("Code saved successfully");
                // You could add a small visual indicator here that save was successful
            } else {
                const data = await response.json();
                throw new Error(data.error || "Failed to save code");
            }
        } catch (error) {
            console.error("Error saving code:", error);
            alert("Błąd podczas zapisywania kodu: " + error.message);
        }
    };

    return (
        <div>
            {/* <div
                style={{
                    position: "absolute",
                    top: "70px", // Position it below the navbar
                    left: "40px", // Increased left offset
                    fontFamily: "sans-serif",
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                }}
                onClick={() =>
                    navigate(-1, {
                        state: { returnedNickname: nickname },
                    })
                }
                className="back-link"
            >
                <span className="arrow">←</span>
                <span className="back-text">powrót</span>
            </div> */}

            {/* <h2 style={{ textAlign: "center", fontFamily: "monospace" }}>
                trening
            </h2> */}

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
                            {piecesAssigned
                                ? `kod (${otherPiece})`
                                : "kod"}
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
                            disabled={isCompiling}
                            style={{
                                padding: "8px 16px",
                                fontFamily: "monospace",
                                cursor: "pointer",
                                backgroundColor: "#f0f0f0",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                marginRight: "20px", // Add some space between buttons
                            }}
                        >
                            zapisz
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
