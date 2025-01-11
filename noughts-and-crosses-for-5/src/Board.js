import React, { useState, useEffect, useRef, useCallback } from "react";
import "./Board.css";

const N = 10; // Board size

const Board = ({ moves, onGameOver }) => {
    const [board, setBoard] = useState(
        Array.from({ length: N }, () => Array(N).fill(" ")),
    );
    const [lastMove, setLastMove] = useState(null);
    const [gameOver, setGameOver] = useState(false);
    const intervalRef = useRef(null); // Ref to store interval ID

    // single action function
    const playMove = useCallback((x, y, player) => {
        setBoard((prevBoard) => {
            const newBoard = prevBoard.map((row) => row.slice()); // deep copy of the board
            newBoard[x][y] = player;
            return newBoard;
        });
        setLastMove([x, y]);
    }, []);

    useEffect(() => {
        if (gameOver) return; // if game over do not run again

        let moveIndex = 0;
        let currentPlayer = "O";

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        intervalRef.current = setInterval(() => {
            if (moveIndex < moves.length) {
                const [x, y] = moves[moveIndex];
                playMove(x, y, currentPlayer);
                currentPlayer = currentPlayer === "O" ? "X" : "O"; // Toggle player after each move
                moveIndex += 1;
            } else {
                clearInterval(intervalRef.current);
                setGameOver(true); // Ustaw gameOver na true po zakończeniu gry
                onGameOver(); // Notify that the game is over
            }
        }, 200);

        return () => clearInterval(intervalRef.current); // Cleanup on unmount
    }, [moves, onGameOver, playMove, gameOver]);

    return (
        <div>
            <table className="board">
                <tbody>
                    {board.map((row, i) => (
                        <tr key={i}>
                            {row.map((cell, j) => (
                                <td
                                    key={j}
                                    className={`cell ${lastMove && lastMove[0] === i && lastMove[1] === j ? "last-move" : ""}`}
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {gameOver} {}
        </div>
    );
};

export default Board;
