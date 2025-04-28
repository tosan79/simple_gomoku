import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Board from "./Board";
import "./Screens.css";

function SecondScreen() {
    const location = useLocation();
    const navigate = useNavigate();
    const nickname = location.state?.nickname;

    const [moves, setMoves] = useState([]);
    const [winner, setWinner] = useState("");
    const [gameOver, setGameOver] = useState(false);
    const [firstPlayer, setFirstPlayer] = useState("");

    useEffect(() => {
        fetch("/moves.json")
            .then((response) => response.json())
            .then((data) => {
                setMoves(data.moves); // Note: now accessing moves from data.moves
                if (data.moves.length > 0) {
                    setWinner(data.moves.length % 2 === 0 ? "X" : "O");
                }
                setFirstPlayer(data.first_player);
            })
            .catch((error) => console.error("Error fetching moves:", error));
    }, []);

    const handleGameOver = () => {
        setGameOver(true);
    };

    // If no nickname is provided, redirect back to welcome screen
    if (!nickname) {
        navigate("/");
        return null;
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
                <div>
                    {nickname} plays as {firstPlayer === 'process1' ? 'O' : 'X'}
                </div>
                <div>
                    {location.state?.opponent} plays as {firstPlayer === 'process1' ? 'X' : 'O'}
                </div>
            </div>
            <Board moves={moves} onGameOver={handleGameOver} />
            {gameOver && (
                <p style={{ textAlign: "center", fontFamily: "monospace" }}>
                    Winner: {winner}
                </p>
            )}
        </div>
    );
}

export default SecondScreen;
