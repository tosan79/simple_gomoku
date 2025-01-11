import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Screens.css";

function WelcomeScreen() {
    const [nickname, setNickname] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedOpponent, setSelectedOpponent] = useState("");
    const [isFileUploaded, setIsFileUploaded] = useState(false); // prod
    const navigate = useNavigate();

    const handleStart = async () => {
        if (nickname.trim() && isFileUploaded && selectedOpponent) {
            try {
                console.log("Starting game with:", {
                    opponent: selectedOpponent,
                    nickname,
                }); // Debug log

                const response = await fetch(
                    "http://localhost:4000/start-game",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            opponent: selectedOpponent,
                            nickname: nickname,
                        }),
                    },
                );

                if (response.ok) {
                    const data = await response.json();
                    console.log("Game response:", data); // Debug log
                    if (data.movesFileReady) {
                        navigate("/second", {
                            state: {
                                nickname,
                                opponent: selectedOpponent,
                            },
                        });
                    }
                } else {
                    throw new Error("Game initialization failed");
                }
            } catch (error) {
                console.error("Error starting game:", error);
                alert("Failed to start game");
            }
        } else {
            alert("Please fill in all fields!");
        }
    };

    // const handleFileChange = (event) => {
    //     const file = event.target.files[0];
    //     if (file && file.name.endsWith(".cpp")) {
    //         setSelectedFile(file);
    //         // For development, we'll just store the file in state
    //         // In production, you would upload to a server here:

    //         // Create FormData to send the file
    //         const formData = new FormData();
    //         formData.append("nickname", nickname);
    //         formData.append("file", file);

    //         fetch("http://localhost:4000/uploads", {
    //             method: "POST",
    //             body: formData,
    //         })
    //             .then((response) => {
    //                 console.log("Response status:", response.status); // Debug log
    //                 if (response.ok) {
    //                     setIsFileUploaded(true);
    //                     return response.text(); // or response.json() if server sends JSON
    //                 } else {
    //                     throw new Error("Upload failed");
    //                 }
    //             })
    //             .then((data) => {
    //                 // console.log("Server response:", data); // Debug log
    //             })
    //             .catch((error) => {
    //                 console.error("Error uploading file:", error);
    //                 setIsFileUploaded(false);
    //                 alert("Failed to upload file");
    //             });
    //     } else {
    //         alert("Please select a .cpp file");
    //         event.target.value = "";
    //         setSelectedFile(null);
    //         setIsFileUploaded(false);
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
            <h1> code the game yourself & play </h1>
            <div style={{ marginTop: "100px" }}>
                <label
                    htmlFor="nickname"
                    style={{ marginRight: "10px", fontFamily: "monospace" }}
                >
                    name:
                </label>
                <input
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                />
            </div>
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

            {isFileUploaded && (
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

            {isFileUploaded && selectedOpponent && (
                <button
                    onClick={handleStart}
                    style={{
                        padding: "5px 10px",
                        fontFamily: "monospace",
                        marginTop: "20px",
                    }}
                >
                    start
                </button>
            )}
        </div>
    );
}

export default WelcomeScreen;
