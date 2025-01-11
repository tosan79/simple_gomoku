import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import WelcomeScreen from "./WelcomeScreen";
//import SecondScreen from "./SecondScreen"
import Game from "./Game"
import SecondScreen from "./SecondScreen";

function App() {
    return (
      <Router>
          <Routes>
              <Route path="/" element={<Game />} />
              <Route path="/login" element={<WelcomeScreen />} />
              <Route path="/second" element={<SecondScreen />} />
          </Routes>
      </Router>
    );
}

export default App;
