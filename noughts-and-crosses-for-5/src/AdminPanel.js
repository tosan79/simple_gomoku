import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminPanel() {
    const [rooms, setRooms] = useState([]);
    const [newRoom, setNewRoom] = useState('');
    const [programs, setPrograms] = useState([]);
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            const response = await fetch('http://localhost:4000/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            if (response.ok) {
                setIsAuthenticated(true);
                fetchRooms();
                fetchPrograms();
            } else {
                alert('Nieprawidłowe hasło');
            }
        } catch (error) {
            console.error('Login error:', error);
        }
    };

    const fetchRooms = async () => {
        const response = await fetch('http://localhost:4000/api/admin/rooms');
        const data = await response.json();
        setRooms(data.rooms);
    };

    const fetchPrograms = async () => {
        const response = await fetch('http://localhost:4000/api/admin/programs');
        const data = await response.json();
        setPrograms(data.programs);
    };

    const handleAddRoom = async () => {
        try {
            const response = await fetch('http://localhost:4000/api/admin/rooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ roomId: newRoom }),
            });

            if (response.ok) {
                setNewRoom('');
                fetchRooms();
            }
        } catch (error) {
            console.error('Error adding room:', error);
        }
    };

    const handleDeleteRoom = async (roomId) => {
        try {
            await fetch(`http://localhost:4000/api/admin/rooms/${roomId}`, {
                method: 'DELETE',
            });
            fetchRooms();
        } catch (error) {
            console.error('Error deleting room:', error);
        }
    };

    const handleDeleteProgram = async (programName) => {
        try {
            await fetch(`http://localhost:4000/api/admin/programs/${programName}`, {
                method: 'DELETE',
            });
            fetchPrograms();
        } catch (error) {
            console.error('Error deleting program:', error);
        }
    };

    if (!isAuthenticated) {
        return (
            <>
                <div
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
                        navigate(-1)
                    }
                    className="back-link"
                >
                    <span className="arrow">←</span>
                    <span className="back-text">powrót</span>
                </div>

            <div style={{ padding: '20px' }}>
                <h2>Panel Admina</h2>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Hasło"
                />
                <button onClick={handleLogin}>Zaloguj</button>
            </div>
            </>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <h2>Panel Admina</h2>

            <div style={{ marginBottom: '20px' }}>
                <h3>Pokoje</h3>
                <div>
                    <input
                        type="text"
                        value={newRoom}
                        onChange={(e) => setNewRoom(e.target.value)}
                        placeholder="ID pokoju"
                    />
                    <button onClick={handleAddRoom}>Dodaj pokój</button>
                </div>
                <ul>
                    {rooms.map(room => (
                        <li key={room}>
                            {room}
                            <button onClick={() => handleDeleteRoom(room)}>Usuń</button>
                        </li>
                    ))}
                </ul>
            </div>

            <div>
                <h3>Programy</h3>
                <ul>
                    {programs.map(program => (
                        <li key={program.name}>
                            {program.name} ({program.room})
                            <button onClick={() => handleDeleteProgram(program.name)}>
                                Usuń
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default AdminPanel;
