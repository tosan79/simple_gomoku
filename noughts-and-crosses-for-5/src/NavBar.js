import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./NavBar.css";

const NavBar = ({ variant = "full" }) => {
    const navigate = useNavigate();
    const loginStyle = { color: "#FF69B4" };

    const handleLogout = () => {
        localStorage.removeItem("user");
        navigate("/");
    };

    return (
        <nav className="navbar">
            {/* Only show logo in full or logo-only variants */}

            {(variant === "full" || variant === "logo-only") && (
                <div className="navbar-logo">
                    CodinGomoku
                    {/* <Link to="/">CodinGomoku</Link> */}
                </div>
            )}

            {variant === "full" && (
                <ul className="navbar-menu">
                    <li>
                        <Link to="/welcome">Początek</Link>
                    </li>
                    <li>
                        <Link to="/x">Jak grać?</Link>
                    </li>
                    <li>
                        <Link to="/test">Trening</Link>
                    </li>
                    <li>
                        <Link to="/first">Zawody</Link>
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
