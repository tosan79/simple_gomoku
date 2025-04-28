import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Screens.css";

function WelcomeScreen() {
    const location = useLocation();
    const [nickname, setNickname] = useState(location.state?.returnedNickname || "");
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedOpponent, setSelectedOpponent] = useState("");
    const [isFileUploaded, setIsFileUploaded] = useState(false); // prod
    const navigate = useNavigate();
    const [gameMode, setGameMode] = useState("normal"); // 'normal' or 'test'
    const [classroom, setClassroom] = useState(""); // Add this new state
    const [showModes, setShowModes] = useState(false);
    const [showUploadSection, setShowUploadSection] = useState(false);
    const [selectedMode, setSelectedMode] = useState(null);

    const expandModes = () => {
        setShowModes(true);
    };

    const handlePracticeClick = () => {
        navigate("/test", {
            state: {
                nickname,
                classroom,
            },
        });
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
            alert("Podaj nazwę gracza!");
            return;
        }
        setShowUploadSection(true);
        setSelectedMode("fight");
    };

    // const handleStart = async () => {
    //     if (nickname.trim() && isFileUploaded && selectedOpponent) {
    //         try {
    //             console.log("Starting game with:", {
    //                 opponent: selectedOpponent,
    //                 nickname,
    //             }); // Debug log

    //             const response = await fetch(
    //                 "http://localhost:4000/start-game",
    //                 {
    //                     method: "POST",
    //                     headers: {
    //                         "Content-Type": "application/json",
    //                     },
    //                     body: JSON.stringify({
    //                         opponent: selectedOpponent,
    //                         nickname: nickname,
    //                     }),
    //                 },
    //             );

    //             if (response.ok) {
    //                 const data = await response.json();
    //                 console.log("Game response:", data); // Debug log
    //                 if (data.movesFileReady) {
    //                     navigate("/second", {
    //                         state: {
    //                             nickname,
    //                             opponent: selectedOpponent,
    //                         },
    //                     });
    //                 }
    //             } else {
    //                 throw new Error("Game initialization failed");
    //             }
    //         } catch (error) {
    //             console.error("Error starting game:", error);
    //             alert("Failed to start game");
    //         }
    //     } else {
    //         alert("Please fill in all fields!");
    //     }
    // };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (file && file.name.endsWith(".cpp")) {
            setSelectedFile(file);

            const formData = new FormData();
            formData.append("nickname", nickname);
            formData.append("file", file);
            formData.append("opponent", selectedOpponent);

            try {
                const response = await fetch("http://localhost:4000/uploads", {
                    method: "POST",
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    setIsFileUploaded(true);

                    if (data.movesFileReady) {
                        // Navigate to SecondScreen only after game is completed and moves.json is ready
                        navigate("/second", {
                            state: {
                                nickname,
                                opponent: selectedOpponent,
                            },
                        });
                    }
                } else {
                    throw new Error("Upload failed");
                }
            } catch (error) {
                console.error("Error uploading file:", error);
                setIsFileUploaded(false);
                alert("Failed to upload file");
            }
        } else {
            alert("Please select a .cpp file");
            event.target.value = "";
            setSelectedFile(null);
            setIsFileUploaded(false);
        }
    };

    return (
        <div>
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
                        <input
                            id="nickname"
                            type="text"
                            value={nickname}
                            onChange={(e) => {
                                const newNickname = e.target.value;
                                setNickname(newNickname);
                                // sessionStorage.setItem('nickname', newNickname);
                            }}
                            style={{ width: "200px", marginLeft: "10px" }}
                        />
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
                            <input
                                id="klasa"
                                type="text"
                                value={classroom}
                                onChange={(e) => setClassroom(e.target.value)}
                                style={{ width: "30px", marginLeft: "5px" }}
                            />
                        </div>
                        <span
                            style={{
                                marginTop: "5px",
                                fontSize: "10px",
                                color: "#666",
                                fontFamily: "monospace",
                            }}
                        >
                            (opcjonalnie)
                        </span>
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
                    <div style={{
                        marginTop: "40px",
                        width: "80%",
                        maxWidth: "800px",
                        position: "relative", // Add this
                    }}>
                        <div style={{
                            display: "flex",
                            gap: "20px",
                        }}>
                            {/* Training mode div */}
                            <div style={{
                                flex: 1,
                                textAlign: "center",
                                padding: "20px",
                                border: "1px solid #ccc",
                                cursor: selectedMode === 'fight' ? 'not-allowed' : 'pointer',
                                opacity: selectedMode === 'fight' ? 0.5 : 1,
                                transition: 'opacity 0.3s ease', // Smooth transition
                            }} onClick={handlePracticeClick}>
                                <h2>TRENUJ</h2>
                                <p>naucz się, jak napisać swój pierwszy program grający w gomoku, a potem spróbuj go udoskonalić!</p>
                            </div>

                            {/* Fight mode div */}
                            <div style={{
                                flex: 1,
                                textAlign: "center",
                                padding: "20px",
                                border: "1px solid #ccc",
                                cursor: "pointer",
                            }} onClick={handleFightClick}>
                                <h2>WALCZ</h2>
                                <p>weź udział w zawodach zgłaszając swój program, który zagra przeciwko botom innych graczy!</p>
                            </div>
                        </div>

                        {/* Upload section positioned relative to right box */}
                        {showUploadSection && (
                            <div style={{
                                position: "absolute",
                                right: 0,
                                top: "100%",
                                width: "calc(50% - 10px)", // Half width minus half of the gap
                                marginTop: "20px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "10px",
                            }}>
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
                                    wgraj swój kod
                                </button>
                                {selectedFile && (
                                    <>
                                        <span style={{ fontFamily: "monospace", fontSize: "14px" }}>
                                            {selectedFile.name}
                                        </span>
                                        <button
                                            style={playButtonStyle}
                                            onClick={() => navigate("/first", {
                                                state: { nickname, classroom }
                                            })}
                                            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                                            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                                        >
                                            <span style={playSymbolStyle}></span>
                                        </button>
                                    </>
                                )}
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
