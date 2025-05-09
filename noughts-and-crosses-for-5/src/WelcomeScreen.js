import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Screens.css";
import HelpPanel from "./HelpPanel";

function WelcomeScreen() {
    const location = useLocation();
    const [nickname, setNickname] = useState(
        location.state?.returnedNickname || "",
    );
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedOpponent, setSelectedOpponent] = useState("");
    const [isFileUploaded, setIsFileUploaded] = useState(false);
    const navigate = useNavigate();
    // const [gameMode, setGameMode] = useState("normal");
    const [classroom, setClassroom] = useState(""); // Add this new state
    const [showModes, setShowModes] = useState(false);
    const [showUploadSection, setShowUploadSection] = useState(false);
    const [selectedMode, setSelectedMode] = useState(null);
    const [returnedFromTraining, setReturnedFromTraining] = useState(false);
    const [selectedPiece, setSelectedPiece] = useState(null);

    const checkNickname = async (newNickname) => {
        try {
            const response = await fetch(
                `http://localhost:4000/api/check-nickname/${newNickname}`,
            );
            const data = await response.json();

            if (data.exists) {
                const userChoice = window.confirm(
                    "użytkownik o tej nazwie już istnieje. jeśli to Ty, naciśnij OK. jeśli nie, naciśnij ANULUJ i wybierz inną nazwę",
                );

                if (!userChoice) {
                    setNickname("");
                    return false;
                }
            }
            return true;
        } catch (error) {
            console.error("Error checking nickname:", error);
            return false;
        }
    };

    useEffect(() => {
        if (location.state?.returnedNickname) {
            setReturnedFromTraining(true);
            setShowModes(true);
        }
    }, [location.state]);

    // const expandModes = async () => {
    //     if (!nickname.trim()) {
    //         alert("podaj nazwę gracza");
    //         return;
    //     }

    //     const isValidNickname = await checkNickname(nickname);
    //     if (isValidNickname) {
    //         setShowModes(true);
    //     }
    //
    // };

    const expandModes = async () => {
        if (!nickname.trim()) {
            alert("podaj nazwę gracza");
            return;
        }

        try {
            const isValidNickname = await checkNickname(nickname);
            if (isValidNickname) {
                setShowModes(true);
            }
        } catch (error) {
            console.error("Error checking nickname:", error);
            alert("Błąd podczas sprawdzania nazwy gracza");
        }

        // if (!classroom) {
        //     alert('podaj numer pokoju');
        //     return;
        // }

        // // Validate room exists
        // try {
        //     const response = await fetch(`http://localhost:4000/api/check-room/${classroom}`);
        //     const data = await response.json();

        //     if (!data.exists) {
        //         alert('Podany pokój nie istnieje');
        //         return;
        //     }

        //     const isValidNickname = await checkNickname(nickname);
        //     if (isValidNickname) {
        //         setShowModes(true);
        //     }
        // } catch (error) {
        //     console.error('Error checking room:', error);
        //     alert('Błąd podczas sprawdzania pokoju');
        // }
    };

    const handlePracticeClick = () => {
        if (selectedMode !== "fight") {
            navigate("/test", {
                state: {
                    nickname,
                    classroom,
                },
            });
        }
    };

    const playButtonStyle = {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "60px",
        height: "60px",
        backgroundColor: "#FF69B4",
        border: "none",
        borderRadius: "50%",
        cursor: "pointer",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
        transition: "transform 0.2s ease",
    };

    const playSymbolStyle = {
        width: "0",
        height: "0",
        borderTop: "12px solid transparent",
        borderBottom: "12px solid transparent",
        borderLeft: "20px solid white", // This creates the triangle
        marginLeft: "5px", // Slight adjustment to center it visually
    };

    const handleFightClick = () => {
        if (!nickname.trim()) {
            alert("podaj nazwę gracza");
            return;
        }
        setShowUploadSection(true);
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (file && file.name.endsWith(".cpp")) {
            try {
                console.log("Starting file upload process");
                setSelectedFile(file);

                const formData = new FormData();
                formData.append("nickname", nickname);
                formData.append("file", file);
                formData.append("opponent", selectedOpponent);

                console.log("Sending request to server...", {
                    fileName: file.name,
                    size: file.size,
                    nickname: nickname,
                });

                const response = await fetch(
                    "http://localhost:4000/api/uploads",
                    {
                        method: "POST",
                        body: formData,
                    },
                );

                console.log("Received response:", {
                    status: response.status,
                    statusText: response.statusText,
                });

                const data = await response.json();
                console.log("Response data:", data);
                setSelectedMode("fight");

                // setSelectedMode("fight");
                if (response.ok) {
                    setSelectedMode("fight");
                    setIsFileUploaded(true);
                    console.log("Upload successful");
                } else {
                    throw new Error(data.error || "Upload failed");
                }
            } catch (error) {
                console.error("Error during upload:", error);
                setIsFileUploaded(false);
                setSelectedMode(null);
                alert(`Failed to upload file: ${error.message}`);
            }
        } else {
            alert("Please select a .cpp file");
            event.target.value = "";
            setSelectedFile(null);
            setIsFileUploaded(false);
            setSelectedMode(null);
        }
    };

    return (
        <div>
            {/* <div
                style={{
                    position: "absolute",
                    top: "70px", // Position it below the navbar
                    left: "40px", // Increased left offset
                    fontFamily: "sans-serif",
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                }}
                onClick={() =>
                    navigate("/")
                }
                className="back-link"
            >
                <span className="arrow">←</span>
                <span className="back-text">powrót</span>
            </div> */}

            <div
                style={{
                    marginTop: "100px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center", // This ensures vertical alignment
                        }}
                    >
                        <label
                            htmlFor="nickname"
                            style={{ fontFamily: "monospace" }}
                        >
                            nazwa gracza:
                        </label>
                        <span
                            style={{
                                width: "200px",
                                marginLeft: "10px",
                                fontFamily: "monospace",
                                fontWeight: "bold",
                                padding: "2px 0",
                            }}
                        >
                            {nickname}
                        </span>
                        {/* <input
                            id="nickname"
                            type="text"
                            value={nickname}
                            onChange={(e) => {
                                const newNickname = e.target.value;
                                setNickname(newNickname);
                                // localStorage.setItem("nickname", newNickname);
                            }}
                            style={{ width: "200px", marginLeft: "10px" }}
                        /> */}
                    </div>

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            marginLeft: "10px",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                height: "22px", // Match the height of the other input
                            }}
                        >
                            <label
                                htmlFor="kl"
                                style={{ fontFamily: "monospace" }}
                            >
                                klasa:
                            </label>
                            <span
                                style={{
                                    width: "30px",
                                    marginLeft: "5px",
                                    fontFamily: "monospace",
                                    fontWeight: "bold",
                                    padding: "2px 0",
                                }}
                            >
                                {classroom || ""}
                            </span>
                            {/* <input
                                id="klasa"
                                type="text"
                                value={classroom}
                                onChange={(e) => setClassroom(e.target.value)}
                                style={{ width: "30px", marginLeft: "5px" }}
                            /> */}
                        </div>
                        {/* <span
                            style={{
                                marginTop: "5px",
                                fontSize: "10px",
                                color: "#666",
                                fontFamily: "monospace",
                            }}
                        >
                            (opcjonalnie)
                        </span> */}
                    </div>
                </div>

                {!showModes && (
                    <div style={{ marginTop: "20px" }}>
                        <button
                            onClick={expandModes}
                            style={{
                                padding: "5px 10px",
                                fontFamily: "monospace",
                                cursor: "pointer",
                            }}
                        >
                            rozpocznij
                        </button>
                    </div>
                )}

                {showModes && (
                    <div
                        style={{
                            marginTop: "40px",
                            width: "80%",
                            maxWidth: "800px",
                            position: "relative", // Add this
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                gap: "20px",
                            }}
                        >
                            {/* Training mode div */}
                            <div
                                style={{
                                    flex: 1,
                                    textAlign: "center",
                                    padding: "20px",
                                    border: "1px solid #ccc",
                                    cursor: "pointer",
                                    // selectedMode === "fight"
                                    //     ? "not-allowed"
                                    //     : "pointer",
                                    opacity: selectedMode === "fight" ? 0.5 : 1,
                                    // transition: "opacity 0.3s ease", // Smooth transition
                                }}
                                onClick={handlePracticeClick}
                            >
                                <h2>TRENUJ</h2>
                                <p>
                                    naucz się, jak napisać swój pierwszy program
                                    grający w gomoku, a potem spróbuj go
                                    udoskonalić!
                                </p>
                            </div>

                            {/* Fight mode div */}
                            <div
                                style={{
                                    flex: 1,
                                    textAlign: "center",
                                    padding: "20px",
                                    border: "1px solid #ccc",
                                    cursor: "pointer",
                                }}
                                onClick={handleFightClick}
                            >
                                <h2>WALCZ</h2>
                                <p>
                                    weź udział w zawodach zgłaszając swój
                                    program, który zagra przeciwko botom innych
                                    graczy!
                                </p>
                            </div>
                        </div>

                        {/* Upload section positioned relative to right box */}
                        {showUploadSection && (
                            <div
                                style={{
                                    position: "absolute",
                                    right: 0,
                                    top: "100%",
                                    width: "calc(50% - 10px)", // Half width minus half of the gap
                                    marginTop: "20px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "10px",
                                }}
                            >
                                <input
                                    type="file"
                                    id="file"
                                    accept=".cpp"
                                    onChange={handleFileChange}
                                    style={{ display: "none" }}
                                />
                                <div style={{ display: "flex", gap: "20px" }}>
                                    <button
                                        onClick={() =>
                                            document
                                                .getElementById("file")
                                                .click()
                                        }
                                        style={{
                                            padding: "5px 10px",
                                            fontFamily: "monospace",
                                            cursor: "pointer",
                                        }}
                                    >
                                        wgraj swój kod
                                    </button>
                                    {selectedFile && (
                                        <>
                                            {/* <span
                                            style={{
                                                fontFamily: "monospace",
                                                fontSize: "14px",
                                                display: "block",
                                            }}
                                        > */}
                                            {selectedFile.name}
                                            {/* </span> */}
                                            <button
                                                style={playButtonStyle}
                                                onClick={() =>
                                                    navigate("/first", {
                                                        state: {
                                                            nickname,
                                                            classroom,
                                                        },
                                                    })
                                                }
                                                onMouseOver={(e) =>
                                                    (e.currentTarget.style.transform =
                                                        "scale(1.1)")
                                                }
                                                onMouseOut={(e) =>
                                                    (e.currentTarget.style.transform =
                                                        "scale(1)")
                                                }
                                            >
                                                <span
                                                    style={playSymbolStyle}
                                                ></span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* <div style={{ marginTop: "20px" }}>
                    <button
                        onClick={expandModes}
                        style={{
                            padding: "5px 10px",
                            fontFamily: "monospace",
                            cursor: "pointer",
                        }}
                    >
                        rozpocznij
                    </button>
                </div> */}
            </div>
            {/* {selectedFile && (
                <div
                    style={{
                        marginTop: "100px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        alignItems: "center",
                    }}
                >
                    <div>O czy X ?</div>
                    <div
                        style={{
                            display: "flex",
                            gap: "10px",
                        }}
                    >
                        <button
                            onClick={() => setSelectedPiece("O")}
                            style={{
                                padding: "10px",
                                backgroundColor:
                                    selectedPiece === "O" ? "#FF69B4" : "white",
                            }}
                        >
                            O
                        </button>
                        <button
                            onClick={() => setSelectedPiece("X")}
                            style={{
                                padding: "10px",
                                backgroundColor:
                                    selectedPiece === "X" ? "#FF69B4" : "white",
                            }}
                        >
                            X
                        </button>
                        <button
                            onClick={() => {
                                const pieces = ["O", "X"];
                                const randomIndex = Math.floor(
                                    Math.random() * pieces.length,
                                );
                                setSelectedPiece(pieces[randomIndex]);
                            }}
                            style={{
                                padding: "10px",
                                backgroundColor:
                                    selectedPiece === "random"
                                        ? "#FF69B4"
                                        : "white",
                                fontFamily: "monospace",
                            }}
                        >
                            losuj
                        </button>
                    </div>
                    {selectedPiece && (
                        <div
                            style={{
                                marginTop: "10px",
                                fontFamily: "monospace",
                                fontSize: "14px",
                            }}
                        >
                            {selectedPiece === "random"
                                ? "kliknij aby wylosować"
                                : `wybrałeś: ${selectedPiece}`}
                        </div>
                    )}
                </div>
            )} */}

            {/*
            <div style={{ marginTop: "10px" }}>
                <input
                    type="file"
                    id="file"
                    accept=".cpp"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                />
                <button
                    onClick={() => document.getElementById("file").click()}
                    style={{
                        padding: "5px 10px",
                        fontFamily: "monospace",
                        cursor: "pointer",
                    }}
                >
                    upload your code
                </button>
                {selectedFile && (
                    <span
                        style={{
                            marginLeft: "10px",
                            fontFamily: "monospace",
                        }}
                    >
                        {selectedFile.name}
                    </span>
                )}
            </div>
            */}

            {/* {isFileUploaded && (
                <div style={{ marginTop: "20px" }}>
                    <label
                        htmlFor="opponent"
                        style={{ marginRight: "10px", fontFamily: "monospace" }}
                    >
                        select opponent:
                    </label>
                    <select
                        id="opponent"
                        value={selectedOpponent}
                        onChange={(e) => setSelectedOpponent(e.target.value)}
                        style={{ fontFamily: "monospace" }}
                    >
                        <option value="">choose...</option>
                        <option value="admin">admin</option>
                        <option value="random">random</option>
                    </select>
                </div>
            )}

            {isFileUploaded && (
                <div style={{ marginTop: "20px" }}>
                    <label
                        style={{ marginRight: "10px", fontFamily: "monospace" }}
                    >
                        mode:
                    </label>
                    <select
                        value={gameMode}
                        onChange={(e) => setGameMode(e.target.value)}
                        style={{ fontFamily: "monospace" }}
                    >
                        <option value="normal">normal</option>
                        <option value="test">test</option>
                    </select>
                </div>
            )}

            {isFileUploaded && selectedOpponent && (
                <button
                    onClick={() => {
                        if (gameMode === "test") {
                            navigate("/test", {
                                state: {
                                    nickname,
                                    opponent: selectedOpponent,
                                },
                            });
                        } else {
                            handleStart();
                        }
                    }}
                    style={{
                        padding: "5px 10px",
                        fontFamily: "monospace",
                        marginTop: "20px",
                    }}
                >
                    start
                </button>
            )} */}
        </div>
    );
}

export default WelcomeScreen;
