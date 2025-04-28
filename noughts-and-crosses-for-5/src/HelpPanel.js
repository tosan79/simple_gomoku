import React, { useState } from "react";

const HelpPanel = ({ content }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div
            style={{
                position: "fixed",
                left: "20px",
                bottom: "20px",
                width: isExpanded ? "300px" : "40px",
                minHeight: "40px",
                backgroundColor: "white",
                border: "1px solid #ccc",
                borderRadius: "5px",
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                transition: "width 0.3s ease",
                zIndex: 1000,
                fontFamily: "monospace",
            }}
        >
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    position: "absolute",
                    top: "50%",
                    left: isExpanded ? "10px" : "50%",
                    transform: isExpanded
                        ? "translateY(-50%)"
                        : "translate(-50%, -50%)",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontSize: "20px",
                }}
            >
                {isExpanded ? "×" : "?"}
            </button>
            {isExpanded && (
                <div
                    style={{
                        padding: "15px 15px 15px 40px",
                        fontSize: "14px",
                    }}
                >
                    {content}
                </div>
            )}
        </div>
    );
};

export default HelpPanel;
