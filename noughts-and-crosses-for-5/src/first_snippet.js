    return (
        <div>
            <h2 style={{ textAlign: "center", fontFamily: "monospace" }}>
                pojedynek
            </h2>

            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    alignContent: "center",
                    justifyContent: "center",
                    position: "relative",
                    padding: "20px",
                    gap: "80px",
                }}
            >
                {/* Player 1 section */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "10px",
                        marginLeft: "60px",
                    }}
                >
                    <div>nickname</div>
                    <div>{piecesAssigned ? selectedPiece : "?"}</div>
                </div>

                {/* VS text */}
                <div style={{ alignSelf: "center" }}>vs</div>

                {/* Player 2 section - just a basic dropdown */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "10px",
                    }}
                >
                    <select
                        value={selectedOpponent}
                        onChange={(e) => setSelectedOpponent(e.target.value)}
                        style={{
                            padding: "5px 10px",
                            fontFamily: "monospace",
                            cursor: "pointer",
                            width: "140px",
                        }}
                    >
                        <option value="">wybierz przeciwnika</option>
                    </select>
                </div>
            </div>
        </div>
    );
