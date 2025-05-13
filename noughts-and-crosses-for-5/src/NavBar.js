import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./NavBar.css";

const NavBar = ({ variant = "full" }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const userData = JSON.parse(localStorage.getItem("user")) || {};
    const [showTrainingDropdown, setShowTrainingDropdown] = useState(false);

    // If variant is "empty", don't render the navbar at all
    if (variant === "empty") {
        return null;
    }

    const handleLogout = () => {
        localStorage.removeItem("user");
        navigate("/");
    };

    const toggleTrainingDropdown = () => {
        setShowTrainingDropdown(!showTrainingDropdown);
    };

    return (
        <nav className="navbar">
            {/* Only show logo in full or logo-only variants */}
            <div className="navbar-logo">CodinGomoku</div>

            {variant === "full" && (
                <ul className="navbar-menu">
                    <li>
                        <Link
                            to="/welcome"
                            state={{ returnedNickname: userData.username }}
                        >
                            Początek
                        </Link>
                    </li>
                    <li>
                        <a href="rules.html">Jak grać?</a>
                        {/* <Link to="/x" state={{ nickname: userData.username }}>
                            Jak grać?
                        </Link> */}
                    </li>
                    <li className="dropdown">
                        <div
                            className="dropdown-trigger"
                            onClick={toggleTrainingDropdown}
                        >
                            Trening {/* <span className="dropdown-arrow">▼</span> */}
                        </div>
                        {showTrainingDropdown && (
                            <ul className="dropdown-menu">
                                <li>
                                    <Link
                                        to="/test"
                                        state={{ nickname: userData.username }}
                                        onClick={() =>
                                            setShowTrainingDropdown(false)
                                        }
                                    >
                                        Testowanie
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        to="/first"
                                        state={{ nickname: userData.username }}
                                        onClick={() =>
                                            setShowTrainingDropdown(false)
                                        }
                                    >
                                        Pojedynek
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>
                    <li>
                        <li>
                            <a href="/zawody.html">Zawody</a>
                        </li>
                        {/* <Link
                            to="/first" // Keep this as a separate nav item or change as needed
                            state={{ nickname: userData.username }}
                        >
                            Zawody
                        </Link> */}
                    </li>
                    <button
                        onClick={handleLogout}
                        style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            color: "inherit",
                            font: "inherit",
                            cursor: "pointer",
                            textDecoration: "none",
                        }}
                    >
                        Wyloguj
                    </button>
                </ul>
            )}
        </nav>
    );
};

export default NavBar;
