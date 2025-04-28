import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Board from "./Board";
import "./Game.css";
import HelpPanel from "./HelpPanel";

function Game() {
    const [moves, setMoves] = useState([]);
    // const [winner, setWinner] = useState("");
    const [gameOver, setGameOver] = useState(false);
    // const [isFormSubmitted, setIsFormSubmitted] = useState(true);

    useEffect(() => {
        fetch("/moves_demo.json") // Replace with the correct path or URL
            .then((response) => response.json())
            .then((data) => {
                setMoves(data);
                // if (data.length > 0) {
                //     setWinner(data.length % 2 === 0 ? "X" : "O");
                // }
            })
            .catch((error) => console.error("Error fetching moves:", error));
    }, []);

    const handleGameOver = () => {
        setGameOver(true);
    };

    const navigate = useNavigate();

    const handleNextScreen = () => {
        navigate("/welcome");
    };

    const playButtonStyle = {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "60px",
        height: "60px",
        backgroundColor: "#FF69B4",
        border: "none",
        borderRadius: "50%",
        cursor: "pointer",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
        transition: "transform 0.2s ease",
    };

    const playSymbolStyle = {
        width: "0",
        height: "0",
        borderTop: "12px solid transparent",
        borderBottom: "12px solid transparent",
        borderLeft: "20px solid white", // This creates the triangle
        marginLeft: "5px", // Slight adjustment to center it visually
    };

    return (
        <div>
            <>
                <h1>
                    CodinGomoku
                </h1>
                <h3
                    style={{
                        fontFamily: "monospace", // For code-like appearance
                        color: "#666",
                        fontWeight: "normal", // Optional: greyish color like comments
                    }}
                >
                    // wstęp do CodinGames
                </h3>
                <Board moves={moves} onGameOver={handleGameOver} />
                {gameOver && (
                    <p
                        style={{
                            textAlign: "center",
                            fontFamily: "monospace",
                        }}
                    >
                        {/* Winner: {winner} */}
                    </p>
                )}
                {/* <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        paddingRight: "20%", // Adjust this value to move button more left/right
                        marginTop: "20px", // Space between board and button
                    }}
                > */}
                    <button
                        style={playButtonStyle}
                        onClick={handleNextScreen}
                        onMouseOver={(e) =>
                            (e.currentTarget.style.transform = "scale(1.1)")
                        }
                        onMouseOut={(e) =>
                            (e.currentTarget.style.transform = "scale(1)")
                        }
                    >
                        <span style={playSymbolStyle}></span>
                    </button>
                {/* </div> */}
            </>
            {/* )} */}
            {/* <HelpPanel
                content={
                    <div>
                        <p>witaj!</p>
                        <p>
                            aby przejść dalej i poznać tajniki kodowania botów
                            naciśnij PLAY →
                        </p>
                    </div>
                }
            /> */}
        </div>
    );
}

export default Game;
