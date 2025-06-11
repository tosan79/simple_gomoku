import React, { useState, useEffect, useRef, useCallback } from "react";
import "./Board.css";

const N = 15; // Board size

const Board = ({
    moves,
    onGameOver,
    interactive,
    board: propBoard,
    onCellClick,
    winningCells = [],
}) => {
    const [board, setBoard] = useState(
        Array.from({ length: N }, () => Array(N).fill(" ")),
    );
    const [lastMove, setLastMove] = useState(null);
    const [gameOver, setGameOver] = useState(false);
    const intervalRef = useRef(null);

    // Single action function for making a move
    const playMove = useCallback((x, y, player) => {
        setBoard((prevBoard) => {
            const newBoard = prevBoard.map((row) => [...row]); // deep copy
            newBoard[x][y] = player;
            return newBoard;
        });
        setLastMove([x, y]);
    }, []);

    const isWinningCell = (i, j) => {
        return winningCells.some(([x, y]) => x === i && y === j);
    };

    // Handle interactive mode board updates
    useEffect(() => {
        if (interactive && propBoard) {
            setBoard(propBoard);
        }
    }, [interactive, propBoard]);

    // Handle non-interactive mode (automatic playback)
    useEffect(() => {
        if (!interactive && moves && !gameOver) {
            let moveIndex = 0;
            let currentPlayer = "O";

            // Clear any existing interval
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }

            // Start new interval for move playback
            intervalRef.current = setInterval(() => {
                if (moveIndex < moves.length) {
                    const [x, y] = moves[moveIndex];
                    playMove(x, y, currentPlayer);
                    currentPlayer = currentPlayer === "O" ? "X" : "O";
                    moveIndex += 1;
                } else {
                    clearInterval(intervalRef.current);
                    setGameOver(true);
                    if (onGameOver) onGameOver();
                }
            }, 200);

            // Cleanup function
            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }
    }, [moves, interactive, onGameOver, playMove, gameOver]);

    return (
        <div>
            <table className="board">
                <tbody>
                    {board.map((row, i) => (
                        <tr key={i}>
                            {row.map((cell, j) => (
                                <td
                                    key={j}
                                    className={`cell
                                            ${interactive ? "interactive" : ""}
                                            ${
                                                !interactive &&
                                                lastMove &&
                                                lastMove[0] === i &&
                                                lastMove[1] === j
                                                    ? "last-move"
                                                    : ""
                                            }
                                            ${isWinningCell(i, j) ? "winning-cell" : ""}`}
                                    onClick={() => {
                                        if (
                                            interactive &&
                                            onCellClick &&
                                            cell === " "
                                        ) {
                                            onCellClick(i, j);
                                        }
                                    }}
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Board;
