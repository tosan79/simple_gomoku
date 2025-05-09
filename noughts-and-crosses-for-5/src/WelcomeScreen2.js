import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// import "./Screens.css";
import "./WelcomeScreen2.css"

function WelcomeScreen() {
    const location = useLocation();
    const navigate = useNavigate();

    // User information
    const [userData, setUserData] = useState({
        username: location.state?.returnedNickname || "",
        classroom: "",
        role: ""
    });

    // Load user data from localStorage on component mount
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) {
            setUserData({
                username: storedUser.username || "",
                classroom: storedUser.classroom || "",
                role: storedUser.role || "student"
            });
        } else if (!location.state?.returnedNickname) {
            // If no user is logged in and no name was passed, redirect to login
            navigate("/login");
        }
    }, [navigate, location.state]);

    const handleTrainingClick = () => {
        navigate("/test", {
            state: {
                nickname: userData.username,
                classroom: userData.classroom,
            }
        });
    };

    const handleCompetitionClick = () => {
        navigate("/first", {
            state: {
                nickname: userData.username,
                classroom: userData.classroom,
            }
        });
    };

    return (
        <div className="welcome-container">
            {/* User Info Bar */}
            <div className="user-info-bar">
                <div className="user-details">
                    <span>nazwa użytkownika: <strong>{userData.username}</strong></span>
                    {userData.classroom && (
                        <span>klasa: <strong>{userData.classroom}</strong></span>
                    )}
                </div>
            </div>

            {/* Introduction Text */}
            <div className="intro-section">
                <h2>witaj w CodinGomoku!</h2>
                <p>
                    tutaj zaczyna się twoja przygoda z pisaniem botów, które samodzielnie będą grały w grę - zamiast Ciebie!
                    ty musisz je napisać, ale najpierw dowiedzieć się w jaki sposób to zrobić - tak, by uwzględnić m. in. losowanie kto zaczyna,
                    reagowanie na ruchy przeciwnika itp.
                </p>
                <p>
                    na tej stronie dostępne są dwa tryby aktywności:
                </p>
                <ul>
                    <li>
                        <strong>trening</strong> - jest to miejsce do pisania kodu i testowania go. możesz grać przeciwko "samemu sobie",
                        gdy będziesz chciał sprawdzić, jak się zachowuje twój bot, udając ruchy przeciwnika kliknięciem myszki
                        albo w ramach "sparingów" czyli niepunktowanych pojedynków z bossami lub innymi użytkownikami.
                    </li>
                    <li>
                        <strong>zawody</strong> - tutaj odbywa się rywalizacja między twoim programem a programami
                        innych graczy z twojej klasy. ranking tworzony jest na podstawie wyników rozgrywek w trybie "każdy z każdym".
                    </li>
                </ul>
                <p>
                    w zakładce <strong>jak grać?</strong> znajdują się informacje o samej grze <i>Gomoku </i>
                    (to oficjalna <br/> nazwa gry w kółko i krzyżyk w wersji na "pięć w jednej linii").
                </p>
                <p>miłego programowania! :)</p>
            </div>

            {/* Simple Navigation Buttons */}
            <div className="navigation-buttons">
                <button
                    className="nav-button training"
                    onClick={handleTrainingClick}
                >
                    rozpocznij trening
                </button>
                <button
                    className="nav-button competition"
                    onClick={handleCompetitionClick}
                >
                    weź udział w zawodach
                </button>
            </div>

            {/* Leaderboard Section (placeholder) */}
            <div className="leaderboard-section">
                <h3>ranking klasowy</h3>
                <p>tutaj pojawi się ranking dla twojej klasy, gdy będą dostępne wyniki.</p>
                {/* We would fetch and display leaderboard data here */}
            </div>
        </div>
    );
}

export default WelcomeScreen;
