import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Board from "./Board";
import "./Game.css";
import HelpPanel from "./HelpPanel";
import { Link } from "react-router-dom";

function Game() {
    const [moves, setMoves] = useState([]);
    const [gameOver, setGameOver] = useState(false);

    useEffect(() => {
        fetch("/moves_demo.json")
            .then((response) => response.json())
            .then((data) => {
                setMoves(data);
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
        borderLeft: "20px solid white",
        marginLeft: "5px",
    };

    return (
        <div>
            <h1>CodinGomoku</h1>
            <h3
                style={{
                    fontFamily: "monospace",
                    color: "#666",
                    fontWeight: "normal",
                }}
            >
                // wstęp do CodinGames
            </h3>

            <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0 20px",
                marginTop: "20px"
            }}>
                {/* Help text on the left */}
                <div style={{
                    width: "30%",
                    padding: "20px",
                    fontFamily: "sans-serif",
                    fontSize: "16px",
                    lineHeight: "1.6",
                    color: "#333",
                    // backgroundColor: "#f9f9f9",
                    borderRadius: "8px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}>
                    <p> witaj!
                    </p>
                    <p>
                        na tej stronie nauczysz się,
                        jak napisać własny program
                        grający samodzielnie w grę Gomoku.
                    </p>
                    <p>

                        będziesz mógł również rywalizować z innymi użytkownikami, zgłaszając swojego bota w zawodach.
                    </p>
                    <p>
                        aby kontynuować {" "}
                        <Link to="/login" style={{color: "#FF69B4"}} onMouseOver={(e) => e.currentTarget.style.color = "#d81b60"} onMouseOut={(e) => e.currentTarget.style.color = "#FF69B4"}>
                           zaloguj się
                        </Link>
                    </p>
                </div>

                {/* Board component moved to the right */}
                <div style={{ width: "65%" }}>
                    <Board moves={moves} onGameOver={handleGameOver} />
                    {gameOver && (
                        <p
                            style={{
                                textAlign: "center",
                                fontFamily: "monospace",
                            }}
                        >
                        </p>
                    )}
                </div>
            </div>

            {/* <button
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
            </button> */}
        </div>
    );
}

export default Game;
