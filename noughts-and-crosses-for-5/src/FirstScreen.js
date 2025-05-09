import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Board from "./Board";
import "./Screens.css";
import "./BackButton.css";

function FirstScreen() {
    const location = useLocation();
    // const navigate = useNavigate();
    const nickname = location.state?.nickname || "";
    // const classroom = location.state?.classroom;

    // useEffect(() => {
    //   console.log("Location state:", location.state);
    // }, [location.state]);

    // Debug log to see what's being passed
    // useEffect(() => {
    //     console.log("Location state:", location.state);
    //     // Handle classroom if it's an object
    //     if (classroom && typeof classroom === 'object') {
    //         console.log("Classroom is an object:", classroom);
    //     }
    // }, [location.state, classroom]);
    const [opponents, setOpponents] = useState([]);
    const [selectedOpponent, setSelectedOpponent] = useState("");
    const [board, setBoard] = useState(
        Array(10)
            .fill()
            .map(() => Array(10).fill(" ")),
    );
    const [gameStarted, setGameStarted] = useState(false);
    const [winner, setWinner] = useState(null);
    const [gameEnded, setGameEnded] = useState(false);
    const [winningCells, setWinningCells] = useState([]);
    const [lastMove, setLastMove] = useState(null);
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [piecesAssigned, setPiecesAssigned] = useState(false);

    const handleDrawPieces = () => {
        const pieces = ["O", "X"];
        const randomIndex = Math.floor(Math.random() * pieces.length);
        setSelectedPiece(pieces[randomIndex]);
        setPiecesAssigned(true);
    };

    // Fetch available opponents when component mounts
    useEffect(() => {
        fetch("http://localhost:4000/api/get-opponents")
            .then((response) => response.json())
            .then((data) => {
                setOpponents(data.opponents);
            })
            .catch((error) =>
                console.error("Error fetching opponents:", error),
            );
    }, []);

    const handlePlayClick = async () => {
        if (!selectedOpponent) return;

        try {
            setGameStarted(true);
            // Reset all states at the start
            setWinner(null);
            setGameEnded(false);
            setWinningCells([]);
            setBoard(
                Array(10)
                    .fill()
                    .map(() => Array(10).fill(" ")),
            );
            setLastMove(null);

            const response = await fetch(
                "http://localhost:4000/api/start-bot-game",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        player1: nickname,
                        player2: selectedOpponent,
                        selectedPiece: selectedPiece,
                    }),
                },
            );

            const data = await response.json();
            console.log("Game data received:", data);

            if (data.success && data.moves && data.moves.length > 0) {
                // Process moves one by one
                let currentBoard = Array(10)
                    .fill()
                    .map(() => Array(10).fill(" "));

                for (const move of data.moves) {
                    // Update the working copy of the board
                    currentBoard = currentBoard.map((row) => [...row]);
                    currentBoard[move.x][move.y] = move.symbol;

                    // Update the state with the new board
                    setBoard([...currentBoard]);
                    setLastMove([move.x, move.y]);

                    // Check for winner
                    if (move.winner) {
                        setWinner(move.symbol);
                        if (move.winning_cells) {
                            setWinningCells(move.winning_cells);
                        }
                        setGameEnded(true);
                    }

                    // Wait before processing next move
                    await new Promise((resolve) => setTimeout(resolve, 500));
                }
            }
        } catch (error) {
            console.error("Error playing game:", error);
        } finally {
            setGameStarted(false);
        }
    };

    const handlePlayAgain = () => {
        setBoard(
            Array(10)
                .fill()
                .map(() => Array(10).fill(" ")),
        );
        setGameStarted(false);
        setWinner(null);
        setGameEnded(false);
        setPiecesAssigned(false);
        setWinningCells([]);
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

            {/* Header section */}
            <h2
                style={{
                    textAlign: "center",
                    fontFamily: "monospace",
                }}
            >
                pojedynek
            </h2>

            {/* <div
                style={{
                    padding: "20px",
                    position: "relative",
                    gap: "30px",
                    alignItems: "center",
                    marginLeft: "90px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        alignContent: "center",
                        justifyContent: "center",
                        position: "relative",
                    }}
                >
                    <div>
                        {piecesAssigned
                            ? `${nickname} (${selectedPiece})`
                            : nickname}
                    </div>
                    <div
                        style={{
                            marginLeft: "50px",
                        }}
                    >
                        <label htmlFor="opponent"> vs </label>
                        <select
                            value={selectedOpponent}
                            onChange={(e) =>
                                setSelectedOpponent(e.target.value)
                            }
                            style={{
                                marginLeft: "50px",
                                padding: "5px 10px",
                                fontFamily: "monospace",
                                cursor: "pointer",
                                width: "140px",
                            }}
                        >
                            <option value="">wybierz przeciwnika</option>
                            {opponents.map((opponent) => (
                                <option key={opponent} value={opponent}>
                                    {opponent}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div> */}

            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    alignContent: "center",
                    justifyContent: "center",
                    position: "relative",
                    padding: "20px",
                    gap: "80px", // Add gap between player sections
                }}
            >
                {/* Player 1 (User) section */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "10px",
                        marginLeft: "60px",
                    }}
                >
                    <div>{nickname}</div>
                    <div>{piecesAssigned ? selectedPiece : "?"}</div>
                </div>

                {/* VS text */}
                <div style={{ alignSelf: "center" }}>vs</div>

                {/* Player 2 (Opponent) section */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "10px",
                    }}
                >
                    <select
                        value={selectedOpponent}
                        onChange={(e) => setSelectedOpponent(e.target.value)}
                        style={{
                            padding: "5px 10px",
                            fontFamily: "monospace",
                            cursor: "pointer",
                            width: "140px",
                        }}
                    >
                        <option value="">wybierz przeciwnika</option>
                        {opponents.map((opponent) => {
                            // Check if opponent is an object or string
                            const opponentValue =
                                typeof opponent === "object"
                                    ? opponent.name || JSON.stringify(opponent)
                                    : opponent;

                            return (
                                <option
                                    key={opponentValue}
                                    value={opponentValue}
                                >
                                    {opponentValue}
                                </option>
                            );
                        })}
                    </select>
                    <div>
                        {piecesAssigned
                            ? selectedPiece === "O"
                                ? "X"
                                : "O"
                            : "?"}
                    </div>
                </div>
            </div>

            {/* Game board */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                }}
            >
                <Board
                    board={board}
                    interactive={true}
                    winningCells={winningCells}
                />
            </div>
            <div>
                <div
                    style={{
                        height: "30px", // Fixed height to prevent jumping
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        // marginBottom: "20px",
                    }}
                >
                    {selectedOpponent && !piecesAssigned && (
                        <button
                            onClick={handleDrawPieces}
                            style={{
                                padding: "5px 10px",
                                fontFamily: "monospace",
                                cursor: "pointer",
                            }}
                        >
                            wylosuj kto zaczyna
                        </button>
                    )}
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: "20px",
                    gap: "10px",
                }}
            >
                <button
                    onClick={handlePlayClick}
                    disabled={
                        !selectedOpponent ||
                        gameStarted ||
                        gameEnded ||
                        !piecesAssigned
                    }
                    style={{
                        padding: "5px 10px",
                        fontFamily: "monospace",
                        cursor:
                            !selectedOpponent || gameStarted || gameEnded
                                ? "not-allowed"
                                : "pointer",
                        opacity: !selectedOpponent || gameStarted ? 0.5 : 1,
                    }}
                >
                    {gameStarted ? "trwa gra..." : "graj"}
                </button>

                {gameEnded && (
                    <button
                        onClick={handlePlayAgain}
                        style={{
                            padding: "5px 10px",
                            fontFamily: "monospace",
                            cursor: "pointer",
                        }}
                    >
                        rewanż
                    </button>
                )}
            </div>

            {/* Winner announcement */}
            {winner && (
                <div
                    style={{
                        textAlign: "center",
                        marginTop: "20px",
                        fontFamily: "monospace",
                        fontSize: "18px",
                        color: winner === selectedPiece ? "#4CAF50" : "#f44336",
                    }}
                >
                    {winner === selectedPiece ? "wygrałeś" : "przegrałeś"}
                </div>
            )}

            {/* Back button */}
            {/* <div
                style={{
                    position: "fixed",
                    bottom: "20px",
                    left: "20px",
                }}
            >
                <button
                    onClick={() =>
                        navigate("/welcome", {
                            state: { returnedNickname: nickname },
                        })
                    }
                    style={{
                        padding: "5px 10px",
                        fontFamily: "monospace",
                        cursor: "pointer",
                        // backgroundColor: "#f0f0f0",
                        // border: "1px solid #ccc",
                        // borderRadius: "4px",
                    }}
                >
                    powrót
                </button>
            </div> */}
        </div>
    );
}

export default FirstScreen;
