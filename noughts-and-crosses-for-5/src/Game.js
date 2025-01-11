import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Board from "./Board";

function Game() {
    const [moves, setMoves] = useState([]);
    const [winner, setWinner] = useState("");
    const [gameOver, setGameOver] = useState(false);
    // const [isFormSubmitted, setIsFormSubmitted] = useState(true);

    useEffect(() => {
        fetch("/moves_demo.json") // Replace with the correct path or URL
            .then((response) => response.json())
            .then((data) => {
                setMoves(data);
                if (data.length > 0) {
                    setWinner(data.length % 2 === 0 ? "X" : "O");
                }
            })
            .catch((error) => console.error("Error fetching moves:", error));
    }, []);

    const handleGameOver = () => {
        setGameOver(true);
    };

    const navigate = useNavigate();

    const handleNextScreen = () => {
        navigate("/login");
    };

    // const arrowButtonStyle = {
    //     position: "fixed",
    //     bottom: "20px",
    //     right: "20px",
    //     width: "60px",
    //     height: "60px",
    //     backgroundColor: "#FF69B4", // Pink color
    //     border: "none",
    //     borderRadius: "50%",
    //     cursor: "pointer",
    //     display: "flex",
    //     justifyContent: "center",
    //     alignItems: "center",
    //     boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
    //     transition: "transform 0.2s ease",
    // };

    // const arrowStyle = {
    //     border: "solid white",
    //     borderWidth: "0 3px 3px 0",
    //     display: "inline-block",
    //     // justifyContent: "center",
    //     padding: "6px",
    //     transform: "rotate(-45deg)", // Makes it point right
    // };

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

    // const handleFormSubmit = (name, file) => {
    //     // Handle the form submission logic here
    //     // For now, just set the form as submitted
    //     setIsFormSubmitted(true);
    // };

    return (
        <div>
            {/* {!isFormSubmitted ? (
                <FirstScreen onFormSubmit={handleFormSubmit} />
            ) : ( */}
            <>
                <h1
                    style={{
                        textAlign: "center",
                        fontFamily: "monospace",
                        fontWeight: "bold",
                    }}
                >
                    noughts & crosses:
                </h1>
                <h3
                    style={{
                        textAlign: "center",
                        fontFamily: "monospace",
                        fontWeight: 50,
                        letterSpacing: 3,
                    }}
                >
                    5 in a row
                </h3>
                <Board moves={moves} onGameOver={handleGameOver} />
                {gameOver && (
                    <p
                        style={{
                            textAlign: "center",
                            fontFamily: "monospace",
                        }}
                    >
                        Winner: {winner}
                    </p>
                )}
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
            </>
            {/* )} */}
        </div>
    );
}

export default Game;
