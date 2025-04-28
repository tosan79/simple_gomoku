import React from "react";
import { Link } from "react-router-dom";
import "./NavBar.css";

const NavBar = ({ variant = "full" }) => {
  const loginStyle = {
    color: "#FF69B4"
  };

  return (
    <nav className="navbar">
      {/* Only show logo in full or logo-only variants */}
      {(variant === "full" || variant === "logo-only") && (
        <div className="navbar-logo">
          <Link to="/">CodinGomoku</Link>
        </div>
      )}

      {/* In login-only variant, we need a spacer to push the login link to the right */}
      {variant === "login-only" && <div className="navbar-logo"></div>}

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
          <li>
            <Link to="/profile">Mój Profil</Link>
          </li>
        </ul>
      )}

      {variant === "login-only" && (
        <ul className="navbar-menu">
          {/* <li>
            <Link to="/login" style={loginStyle} onMouseOver={(e) => e.currentTarget.style.color = "#d81b60"} onMouseOut={(e) => e.currentTarget.style.color = "#FF69B4"}>
              zaloguj
            </Link>
          </li> */}
        </ul>
      )}
    </nav>
  );
};

export default NavBar;
