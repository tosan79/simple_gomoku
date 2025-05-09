import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import WelcomeScreen from "./WelcomeScreen2";
import Game from "./Game";
import TestMode from "./TestMode_old.js";
import FirstScreen from "./FirstScreen";
import NavBar from "./NavBar";
import Login from "./LoginScreen";
import RegisterScreen from "./RegisterScreen.js";

const AppContent = () => {
    const location = useLocation();
    let navBarVariant = "full"
    if (location.pathname === "/") {
        navBarVariant = "empty"
    } else if (location.pathname === "/login" || location.pathname === "/register") {
        navBarVariant = "logo-only";
    }

    return (
        <>
            <NavBar variant={navBarVariant} />
            <Routes>
                <Route path="/" element={<Game />} />
                <Route path="/welcome" element={<WelcomeScreen />} />
                <Route path="/test" element={<TestMode />} />
                <Route path="/first" element={<FirstScreen />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<RegisterScreen />} />
            </Routes>
        </>
    );
};

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;
