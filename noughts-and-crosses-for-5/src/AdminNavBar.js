import React from "react";
import { useNavigate } from "react-router-dom";
import "./NavBar.css"; // Use your existing NavBar CSS

const AdminNavBar = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/login");
    };

    return (
        <nav className="navbar">
            <div className="navbar-logo">CodinGomoku</div>

            {/* Centered admin panel title */}
            <div
                style={{
                    // position: "absolute",
                    // left: "60%",
                    // transform: "translateX(-50%)",
                    display: "flex",
                    justifyContent: "space-evenly",
                    color: "#FF69B4", // Pink color
                    fontWeight: "bold",
                    fontSize: "1.1em"
                }}
            >
                // pokój nauczycielski
            </div>

            <ul className="navbar-menu">
                <li>
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
                </li>
            </ul>
        </nav>
    );
};

export default AdminNavBar;
