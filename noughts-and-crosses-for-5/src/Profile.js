import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

const Profile = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
            navigate("/login");
            return;
        }

        setUserData(user);
    }, [navigate]);

    if (!userData) {
        return <div>Loading profile...</div>;
    }

    return (
        <div className="profile-container">
            <div className="profile-card">
                <h2>Mój Profil</h2>

                <div className="profile-section">
                    <h3>Informacje o użytkowniku</h3>
                    <div className="profile-info">
                        <div className="info-row">
                            <span className="label">Nazwa użytkownika:</span>
                            <span className="value">{userData.username}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">Rola:</span>
                            <span className="value">{userData.role}</span>
                        </div>
                    </div>
                </div>

                <div className="profile-section">
                    <h3>Moje programy</h3>
                    <p>Tutaj będą wyświetlane Twoje programy...</p>
                </div>
            </div>
        </div>
    );
};

export default Profile;
