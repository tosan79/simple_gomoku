import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./WelcomeScreen2.css";
import "./Competitions.css";
import { API_URL } from "./config";

function Competitions() {
    const [leaderboardData, setLeaderboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${API_URL}/api/classroom/leaderboard`,
                {
                    headers: {
                        Authorization: token,
                    },
                },
            );

            const data = await response.json();
            setLeaderboardData(data);
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            setError("Nie udało się pobrać rankingu");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString("pl-PL");
    };

    const getPositionEmoji = (position) => {
        switch (position) {
            case 1:
                return "🥇";
            case 2:
                return "🥈";
            case 3:
                return "🥉";
            default:
                return `${position}.`;
        }
    };

    if (loading) {
        return (
            <div className="competitions-container">
                <div className="loading">Ładowanie rankingu...</div>
            </div>
        );
    }

    // Show original simple view if no tournament data
    if (error || !leaderboardData?.success) {
        return (
            <div className="leaderboard-section" style={{ marginTop: "60px" }}>
                <h3>ranking klasowy</h3>
                <p>
                    tutaj pojawi się ranking dla twojej klasy, gdy będą dostępne
                    wyniki.
                </p>
                <div className="comptetitions-container">
                    <div className="scoring-info">
                        <h4>system punktacji:</h4>
                        <div>
                            <p>wygrana: 3 punkty<br/>
                            remis: 1 punkt<br/>
                            przegrana: 0 punktów </p>
                        </div>
                    </div>
                </div>
                <div className="action-buttons">
                    <Link to="/welcome" className="back-button">
                        powrót do menu
                    </Link>
                </div>
            </div>
        );
    }

    // Show full leaderboard when data is available
    return (
        <div className="competitions-container">
            {/* <h1>Ranking Klasowy</h1> */}

            <div className="tournament-info">
                <h3>ranking dla klasy: {leaderboardData.classroom}</h3>
                <div className="tournament-details">
                    <p>
                        <strong>zawody zakończone:</strong>{" "}
                        {formatDate(leaderboardData.tournament.endDate)}
                    </p>
                    <p>
                        <strong>rozegrane mecze:</strong>{" "}
                        {leaderboardData.tournament.completedMatches} /{" "}
                        {leaderboardData.tournament.totalMatches}
                    </p>
                    {leaderboardData.tournament.failedMatches > 0 && (
                        <p>
                            <strong>mecze z błędami:</strong>{" "}
                            {leaderboardData.tournament.failedMatches}
                        </p>
                    )}
                </div>
            </div>

            <div className="leaderboard-table-container">
                <table className="leaderboard-table">
                    <thead>
                        <tr>
                            <th>Miejsce</th>
                            <th>Program</th>
                            <th>Punkty</th>
                            <th>Wygrane</th>
                            <th>Remisy</th>
                            <th>Przegrane</th>
                            <th>Mecze</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboardData.leaderboard.map((entry) => (
                            <tr key={entry.player}>
                                <td className="position">
                                    {getPositionEmoji(entry.position)}
                                </td>
                                <td className="player-name">{entry.player}</td>
                                <td className="points">{entry.points}</td>
                                <td className="wins">{entry.wins}</td>
                                <td className="draws">{entry.draws}</td>
                                <td className="losses">{entry.losses}</td>
                                <td className="total-matches">
                                    {entry.matchesPlayed}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="scoring-info">
                <h4>system punktacji:</h4>
                <div>
                    <p>wygrana: 3 punkty</p>
                    <p>remis: 1 punkt</p>
                    <p>przegrana: 0 punktów</p>
                </div>
            </div>

            <div className="action-buttons">
                <Link to="/welcome" className="back-button">
                    powrót do menu
                </Link>
            </div>
        </div>
    );
}

export default Competitions;
