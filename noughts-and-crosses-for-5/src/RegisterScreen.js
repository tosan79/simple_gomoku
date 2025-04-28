// src/RegisterScreen.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginScreen.css"; // Reuse login styling

function RegisterScreen() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [room, setRoom] = useState("");
    const [rooms, setRooms] = useState([]);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // Fetch available rooms
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const response = await fetch("http://localhost:4000/api/legacy/admin/rooms");
                const data = await response.json();
                if (data.rooms) {
                    setRooms(data.rooms);
                }
            } catch (error) {
                console.error("Error fetching rooms:", error);
            }
        };

        fetchRooms();
    }, []);

    const validateForm = () => {
        if (!username || !password || !confirmPassword) {
            setError("Wszystkie pola są wymagane");
            return false;
        }

        if (password !== confirmPassword) {
            setError("Hasła muszą być takie same");
            return false;
        }

        if (password.length < 5) {
            setError("Hasło musi mieć co najmniej 5 znaków");
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!validateForm()) return;

        setIsLoading(true);

        try {
            const response = await fetch("http://localhost:4000/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    password,
                    classroom: room || null
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess("Rejestracja udana! Możesz się teraz zalogować.");
                setTimeout(() => {
                    navigate("/login");
                }, 2000);
            } else {
                setError(data.message || "Błąd podczas rejestracji");
            }
        } catch (err) {
            console.error("Registration error:", err);
            setError("Błąd serwera. Spróbuj ponownie później.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Rejestracja</h2>
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">nazwa użytkownika</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">hasło</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">powtórz hasło</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="room">klasa (opcjonalnie)</label>
                        <select
                            id="room"
                            value={room}
                            onChange={(e) => setRoom(e.target.value)}
                        >
                            <option value="">-- Wybierz klasę --</option>
                            {rooms.map((roomId) => (
                                <option key={roomId} value={roomId}>
                                    {roomId}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading}
                    >
                        {isLoading ? "rejestracja..." : "zarejestruj się"}
                    </button>
                </form>

                <p className="login-footer">
                    masz już konto?{" "}
                    <span onClick={() => navigate("/login")}>
                        zaloguj się
                    </span>
                </p>
            </div>
        </div>
    );
}

export default RegisterScreen;
