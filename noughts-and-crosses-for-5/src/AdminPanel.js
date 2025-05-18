import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavBar from './AdminNavBar';
import './AdminPanel.css';

function AdminPanel() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [users, setUsers] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newRoom, setNewRoom] = useState({ roomId: '', description: '' });
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedRoomForUser, setSelectedRoomForUser] = useState('');
    const navigate = useNavigate();

    // Check if user is admin
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        const token = localStorage.getItem('token');

        if (!token || !user || user.role !== 'admin') {
            navigate('/login');
            return;
        }

        fetchData();
    }, [navigate]);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await Promise.all([
                fetchUsers(),
                fetchRooms(),
                fetchPrograms()
            ]);
        } catch (err) {
            setError("wystąpił błąd podczas pobierania danych");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUsers = async () => {
        const response = await fetch('http://localhost:4000/api/admin/users', {
            headers: {
                'Authorization': localStorage.getItem('token')
            }
        });

        if (!response.ok) {
            throw new Error('failed to fetch users');
        }

        const data = await response.json();
        setUsers(data.users || []);
    };

    const fetchRooms = async () => {
        const response = await fetch('http://localhost:4000/api/admin/rooms', {
            headers: {
                'Authorization': localStorage.getItem('token')
            }
        });

        if (!response.ok) {
            throw new Error('failed to fetch rooms');
        }

        const data = await response.json();
        setRooms(data.rooms || []);
    };

    const fetchPrograms = async () => {
        const response = await fetch('http://localhost:4000/api/get-opponents', {
            headers: {
                'Authorization': localStorage.getItem('token')
            }
        });

        if (!response.ok) {
            throw new Error('failed to fetch programs');
        }

        const data = await response.json();
        setPrograms(data.opponents || []);
    };

    // Create a new classroom
    const handleCreateRoom = async (e) => {
        e.preventDefault();
        if (!newRoom.roomId.trim()) return;

        try {
            const response = await fetch('http://localhost:4000/api/admin/rooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': localStorage.getItem('token')
                },
                body: JSON.stringify({
                    roomId: newRoom.roomId,
                    description: newRoom.description
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'failed to create room');
            }

            setNewRoom({ roomId: '', description: '' });
            await fetchRooms();
        } catch (error) {
            setError(error.message);
        }
    };

    // Delete a classroom
    const handleDeleteRoom = async (roomId) => {
        if (!window.confirm(`czy na pewno chcesz usunąć klasę "${roomId}"?`)) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:4000/api/admin/rooms/${roomId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': localStorage.getItem('token')
                }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'failed to delete room');
            }

            await fetchRooms();
            // Also refresh users since their classroom assignments might be affected
            await fetchUsers();
        } catch (error) {
            setError(error.message);
        }
    };

    // Assign/remove user to/from classroom
    const handleUpdateUserClassroom = async () => {
        if (!selectedUser) return;

        try {
            // We'll create a custom endpoint for this
            const response = await fetch(`http://localhost:4000/api/admin/users/${selectedUser.id}/classroom`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': localStorage.getItem('token')
                },
                body: JSON.stringify({
                    classroom: selectedRoomForUser || null
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'failed to update user classroom');
            }

            await fetchUsers();
            setSelectedUser(null);
            setSelectedRoomForUser('');
        } catch (error) {
            setError(error.message);
        }
    };

    if (isLoading) {
        return (
            <>
                <AdminNavBar />
                <div className="admin-loading">ładowanie danych...</div>
            </>
        );
    }



    return (
        <>
            <AdminNavBar />
            <div className="admin-container">
                <div className="admin-sidebar">
                    <ul>
                        <li className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
                            dashboard
                        </li>
                        <li className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
                            użytkownicy
                        </li>
                        <li className={activeTab === 'rooms' ? 'active' : ''} onClick={() => setActiveTab('rooms')}>
                            klasy
                        </li>
                        <li className={activeTab === 'programs' ? 'active' : ''} onClick={() => setActiveTab('programs')}>
                            programy
                        </li>
                        <li onClick={() => navigate('/welcome')}>
                            powrót do aplikacji
                        </li>
                    </ul>
                </div>

                <div className="admin-content">
                    {error && <div className="admin-error">{error}</div>}

                    {activeTab === 'dashboard' && (
                        <div className="admin-dashboard">
                            <h2>dashboard</h2>
                            <div className="admin-stats">
                                <div className="admin-stat-card">
                                    <h3>użytkownicy</h3>
                                    <div className="admin-stat-value">{users.length}</div>
                                </div>
                                <div className="admin-stat-card">
                                    <h3>klasy</h3>
                                    <div className="admin-stat-value">{rooms.length}</div>
                                </div>
                                <div className="admin-stat-card">
                                    <h3>programy</h3>
                                    <div className="admin-stat-value">{programs.length}</div>
                                </div>
                            </div>

                            {/* <h3>szybkie akcje</h3>
                            <div className="admin-quick-actions">
                                <button onClick={() => setActiveTab('users')}>zarządzaj użytkownikami</button>
                                <button onClick={() => setActiveTab('rooms')}>zarządzaj klasami</button>
                            </div> */}
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="admin-users">
                            <h2>zarządzanie użytkownikami</h2>

                            <div className="admin-section">
                                <h3>przypisz użytkownika do klasy</h3>
                                <div className="admin-form">
                                    <div className="admin-form-row">
                                        <label>użytkownik:</label>
                                        <select
                                            value={selectedUser ? selectedUser.id : ''}
                                            onChange={(e) => {
                                                const userId = e.target.value;
                                                const user = users.find(u => u.id.toString() === userId);
                                                setSelectedUser(user);
                                                setSelectedRoomForUser(user?.classroom || '');
                                            }}
                                        >
                                            <option value="">wybierz użytkownika</option>
                                            {users.map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user.username} {user.classroom && `(${user.classroom})`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedUser && (
                                        <>
                                            <div className="admin-form-row">
                                                <label>klasa:</label>
                                                <select
                                                    value={selectedRoomForUser}
                                                    onChange={(e) => setSelectedRoomForUser(e.target.value)}
                                                >
                                                    <option value="">brak przypisania</option>
                                                    {rooms.map(room => (
                                                        <option key={room.id} value={room.room_id}>
                                                            {room.room_id}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <button onClick={handleUpdateUserClassroom}>
                                                {selectedRoomForUser
                                                    ? `przypisz do ${selectedRoomForUser}`
                                                    : "usuń przypisanie"}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <h3>lista użytkowników</h3>
                            <div className="admin-table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>id</th>
                                            <th>nazwa użytkownika</th>
                                            <th>rola</th>
                                            <th>klasa</th>
                                            <th>data utworzenia</th>
                                            <th>akcje</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(user => (
                                            <tr key={user.id}>
                                                <td>{user.id}</td>
                                                <td>{user.username}</td>
                                                <td>{user.role}</td>
                                                <td>{user.classroom || '-'}</td>
                                                <td>{new Date(user.created_at).toLocaleString()}</td>
                                                <td>
                                                    <button onClick={() => {
                                                        setSelectedUser(user);
                                                        setSelectedRoomForUser(user.classroom || '');
                                                    }}>
                                                        edytuj
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'rooms' && (
                        <div className="admin-rooms">
                            <h2>zarządzanie klasami</h2>

                            <div className="admin-section">
                                <h3>dodaj nową klasę</h3>
                                <form onSubmit={handleCreateRoom} className="admin-form">
                                    <div className="admin-form-row">
                                        <label>id klasy:</label>
                                        <input
                                            type="text"
                                            value={newRoom.roomId}
                                            onChange={(e) => setNewRoom({...newRoom, roomId: e.target.value})}
                                            required
                                            placeholder="np. 2A, 3B, itd."
                                        />
                                    </div>

                                    <div className="admin-form-row">
                                        <label>opis:</label>
                                        <input
                                            type="text"
                                            value={newRoom.description}
                                            onChange={(e) => setNewRoom({...newRoom, description: e.target.value})}
                                            placeholder="opcjonalny opis"
                                        />
                                    </div>

                                    <button type="submit">dodaj klasę</button>
                                </form>
                            </div>

                            <h3>lista klas</h3>
                            <div className="admin-table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>id</th>
                                            <th>nazwa klasy</th>
                                            <th>opis</th>
                                            <th>utworzono przez</th>
                                            <th>data utworzenia</th>
                                            <th>liczba uczniów</th>
                                            <th>akcje</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rooms.map(room => {
                                            const studentsCount = users.filter(user => user.classroom === room.room_id).length;

                                            return (
                                                <tr key={room.id}>
                                                    <td>{room.id}</td>
                                                    <td>{room.room_id}</td>
                                                    <td>{room.description || '-'}</td>
                                                    <td>{room.created_by_username || '-'}</td>
                                                    <td>{new Date(room.created_at).toLocaleString()}</td>
                                                    <td>{studentsCount}</td>
                                                    <td>
                                                        <button
                                                            onClick={() => handleDeleteRoom(room.room_id)}
                                                            className="admin-delete-button"
                                                        >
                                                            usuń
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'programs' && (
                        <div className="admin-programs">
                            <h2>programy</h2>

                            <div className="admin-table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>nazwa</th>
                                            <th>klasa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {programs.map(program => (
                                            <tr key={program.name}>
                                                <td>{program.name}</td>
                                                <td>{program.room || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default AdminPanel;
