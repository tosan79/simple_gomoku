import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import WelcomeScreen from "./WelcomeScreen";
// import SecondScreen from "./SecondScreen";
import Game from "./Game";
import TestMode from "./TestMode";
import FirstScreen from "./FirstScreen";
// import AdminPanel from "./AdminPanel";
import NavBar from "./NavBar";
import Login from "./LoginScreen";
import RegisterScreen from "./RegisterScreen.js";

// Component to conditionally render different versions of NavBar
const AppContent = () => {
    const location = useLocation();
    const currentPath = location.pathname;

    // Determine which NavBar variant to show
    let navBarVariant = "full"; // Default - full navbar

    if (currentPath === "/") {
        navBarVariant = "login-only"; // Only show login link on main game screen
    } else if (currentPath === "/login" || currentPath === "/register") {
        navBarVariant = "logo-only"; // Only show logo on login screen
    }

    return (
        <>
            <NavBar variant={navBarVariant} />
            <Routes>
                <Route path="/" element={<Game />} />
                <Route path="/welcome" element={<WelcomeScreen />} />
                {/* <Route path="/second" element={<SecondScreen />} /> */}
                <Route path="/test" element={<TestMode />} />
                <Route path="/first" element={<FirstScreen />} />
                {/* <Route path="/admin" element={<AdminPanel />} /> */}
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
