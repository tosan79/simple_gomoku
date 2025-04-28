import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Board from "./Board";
import CodeEditor from "./CodeEditor"; // Add this import
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

function Tutorial() {
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

    const handleCodeChange = (newCode) => {
        setCode(newCode);
    };

    // First useEffect for game initialization
    useEffect(() => {
        // if (!nickname || !opponent) {
        //     console.log("Missing nickname or opponent, redirecting to login");
        //     navigate("/login");
        //     return;
        // }

        console.log("Starting interactive game with:", { nickname, opponent });

        // Initialize interactive game
        fetch("http://localhost:4000/start-interactive-game", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ nickname, opponent }),
        })
            .then((response) => {
                console.log("Got response:", response);
                return response.json();
            })
            .then((data) => {
                console.log("Game started with data:", data);
                if (data.success) {
                    setGameId(data.gameId);
                }
            })
            .catch((error) => {
                console.error("Error starting game:", error);
                alert("Failed to start game");
                navigate("/login");
            });
    }, [nickname, opponent, navigate]);

    // Second useEffect for cleanup
    useEffect(() => {
        // Cleanup function
        return () => {
            if (gameId) {
                fetch("http://localhost:4000/end-game", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ gameId }),
                });
            }
        };
    }, [gameId]); // Add gameId to dependency array

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

    const startTutorial = () => {
        const driverObj = driver({
            showProgress: true,
            steps: [
                {
                    element: "#game-board",
                    popover: {
                        title: "plansza",
                        description:
                            "Tutaj zobaczysz ruchy jakie wykonuje Twój program. \
                            W roli przeciwnika jesteś Ty sam - klikaj na pola planszy, żeby sprawdzić, \
                            jak reaguje na nie Twój kod.",
                        position: "right",
                    },
                },
                {
                    element: "#code-editor",
                    popover: {
                        title: "kod",
                        description:
                            "Oto przykładowy kod, który możesz edytować. \
                            Ten program wykonuje ruchy losowo, \
                            czy potrafisz zamiast tego wykonywać je mądrze?",
                        position: "left",
                    },
                },
                {
                    element: "#player-info",
                    popover: {
                        title: "Player Information",
                        description:
                            "Track who is playing and which symbol they are using.",
                        position: "bottom",
                    },
                },
                {
                    element: "#game-status",
                    popover: {
                        title: "Game Status",
                        description:
                            "This area shows whose turn it is and the game result when finished.",
                        position: "top",
                    },
                },
            ],
        });

        driverObj.drive();
    };

    useEffect(() => {
        startTutorial();
    }, []);

    return (
        <div>
            {/* <h2 style={{ textAlign: "center", fontFamily: "monospace" }}>
                zaprogramuj swojego bota
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
                    {/* <h3
                        style={{ textAlign: "center", fontFamily: "monospace" }}
                    >

                    </h3> */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-around",
                            marginBottom: "20px",
                        }}
                    >
                        {/* <div style={{ fontFamily: "monospace" }}>
                            {nickname} (O)
                        </div>
                        <div style={{ fontFamily: "monospace" }}>
                            {opponent} (X)
                        </div> */}
                        <div styte={{ fontFamily: "monospace", fontWeight: "bold" }}>
                            <h3> trening </h3>
                        </div>
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
                    <div id="game-board">
                        <Board
                            board={board}
                            onCellClick={handleCellClick}
                            interactive={true}
                            winningCells={winningCells}
                        />
                    </div>
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
                <div id='code-editor' style={{ flex: 1 }}>
                    <CodeEditor code={code} onChange={handleCodeChange} />
                </div>
            </div>

            {gameEnded && (
                <button
                    onClick={() => navigate("/welcome")}
                    style={{
                        display: "block",
                        margin: "20px auto",
                        padding: "10px 20px",
                        fontFamily: "monospace",
                        cursor: "pointer",
                    }}
                >
                    play again
                </button>
            )}
        </div>
    );
}

export default Tutorial;
