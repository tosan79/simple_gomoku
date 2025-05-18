import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginScreen.css";

function LoginScreen() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        console.log(`Attempting login with username: ${username}`); // Add debugging

        try {
            const response = await fetch("http://localhost:4000/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            console.log(`Response status: ${response.status}`); // Add debugging

            const data = await response.json();
            console.log("Response data:", data); // Add debugging

            if (response.ok) {
                // Store user info in localStorage
                localStorage.setItem(
                    "user",
                    JSON.stringify({
                        username: data.username,
                        classroom: data.classroom,
                        role: data.role,
                    }),
                );
                localStorage.setItem("token", data.token);

                // Redirect based on role
                if (data.role === "admin") {
                    navigate("/admin");
                } else {
                    navigate("/welcome", {
                        state: {
                            returnedNickname: username,
                            classroom: data.classroom,
                        },
                    });
                }
            } else {
                setError(data.message || "Nieprawidłowy login lub hasło");
            }
        } catch (err) {
            console.error("Login error:", err);
            setError("Błąd serwera. Spróbuj ponownie później.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                {/* <h2>Zaloguj się do CodinGomoku</h2> */}
                {error && <div className="error-message">{error}</div>}

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

                    <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading}
                    >
                        {isLoading ? "logowanie..." : "zaloguj"}
                    </button>
                </form>

                <p className="login-footer">
                    jeśli nie masz konta,{" "}
                    <span
                        onClick={() => navigate("/register")}
                        className="register-link"
                    >
                        zarejestruj się
                    </span>
                </p>
            </div>
        </div>
    );
}

export default LoginScreen;
