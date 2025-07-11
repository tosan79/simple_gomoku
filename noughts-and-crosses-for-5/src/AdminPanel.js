import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavBar from "./AdminNavBar";
import "./AdminPanel.css";
import { API_URL } from "./config";

function AdminPanel() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [users, setUsers] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newRoom, setNewRoom] = useState({ roomId: "", description: "" });
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedRoomForUser, setSelectedRoomForUser] = useState("");
    const [selectedRoomForTournament, setSelectedRoomForTournament] =
        useState("");
    const [studentCounts, setStudentCounts] = useState({});
    const [programCounts, setProgramCounts] = useState({}); // New state for program counts
    const [tournamentStatus, setTournamentStatus] = useState({
        inProgress: false,
        id: null,
        progress: 0,
        message: "",
    });
    const navigate = useNavigate();
    const [leaderboard, setLeaderboard] = useState([]);
    const [roomTournaments, setRoomTournaments] = useState([]);

    // Check if user is admin
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        const token = localStorage.getItem("token");

        if (!token || !user || user.role !== "admin") {
            navigate("/login");
            return;
        }

        fetchData();
    }, [navigate]);

    useEffect(() => {
        if (selectedRoomForTournament) {
            fetchRoomTournaments(selectedRoomForTournament);
        } else {
            setRoomTournaments([]);
        }
    }, [selectedRoomForTournament]);

    useEffect(() => {
        // Refresh program counts whenever users data changes
        if (users.length > 0) {
            fetchProgramCounts();
        }
    }, [users]);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await Promise.all([
                fetchUsers(),
                fetchRooms(),
                fetchPrograms(),
                fetchStudentCounts(),
                fetchProgramCounts(), // Add this new function call
            ]);
        } catch (err) {
            setError("wystąpił błąd podczas pobierania danych");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUsers = async () => {
        const response = await fetch(`${API_URL}/api/admin/users`, {
            headers: {
                Authorization: localStorage.getItem("token"),
            },
        });

        if (!response.ok) {
            throw new Error("failed to fetch users");
        }

        const data = await response.json();
        setUsers(data.users || []);
    };

    const fetchRooms = async () => {
        const response = await fetch(`${API_URL}/api/admin/rooms`, {
            headers: {
                Authorization: localStorage.getItem("token"),
            },
        });

        if (!response.ok) {
            throw new Error("failed to fetch rooms");
        }

        const data = await response.json();
        setRooms(data.rooms || []);
    };

    const fetchPrograms = async () => {
        const response = await fetch(`${API_URL}/api/get-opponents`, {
            headers: {
                Authorization: localStorage.getItem("token"),
            },
        });

        if (!response.ok) {
            throw new Error("failed to fetch programs");
        }

        const data = await response.json();
        setPrograms(data.opponents || []);
    };

    const fetchStudentCounts = async () => {
        const response = await fetch(
            `${API_URL}/api/admin/rooms/student-counts`,
            {
                headers: {
                    Authorization: localStorage.getItem("token"),
                },
            },
        );

        if (!response.ok) {
            throw new Error("failed to fetch student counts");
        }

        const data = await response.json();

        // Convert array to object for easy lookup
        const countsMap = {};
        data.counts.forEach((item) => {
            countsMap[item.classroom] = item.count;
        });

        setStudentCounts(countsMap);
    };

    // New function to fetch program counts by classroom
    const fetchProgramCounts = async () => {
        const response = await fetch(
            `${API_URL}/api/admin/programs/classroom-counts`,
            {
                headers: {
                    Authorization: localStorage.getItem("token"),
                },
            },
        );

        if (!response.ok) {
            throw new Error("failed to fetch program counts");
        }

        const data = await response.json();

        // Convert array to object for easy lookup
        const countsMap = {};
        data.counts.forEach((item) => {
            countsMap[item.classroom] = item.count;
        });

        setProgramCounts(countsMap);
    };

    // Create a new classroom
    const handleCreateRoom = async (e) => {
        e.preventDefault();
        if (!newRoom.roomId.trim()) return;

        try {
            const response = await fetch(`${API_URL}/api/admin/rooms`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: localStorage.getItem("token"),
                },
                body: JSON.stringify({
                    roomId: newRoom.roomId,
                    description: newRoom.description,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "failed to create room");
            }

            setNewRoom({ roomId: "", description: "" });
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
            const response = await fetch(
                `${API_URL}/api/admin/rooms/${roomId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: localStorage.getItem("token"),
                    },
                },
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "failed to delete room");
            }

            await fetchRooms();
            // Also refresh users since their classroom assignments might be affected
            await fetchUsers();
            await fetchStudentCounts();
            await fetchProgramCounts(); // Refresh program counts too
        } catch (error) {
            setError(error.message);
        }
    };

    // Assign/remove user to/from classroom
    const handleUpdateUserClassroom = async () => {
        if (!selectedUser) return;

        try {
            const response = await fetch(
                `${API_URL}/api/admin/users/${selectedUser.id}/classroom`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: localStorage.getItem("token"),
                    },
                    body: JSON.stringify({
                        classroom: selectedRoomForUser || null,
                    }),
                },
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(
                    data.error || "failed to update user classroom",
                );
            }

            await fetchUsers();
            await fetchStudentCounts();
            await fetchPrograms();
            await fetchProgramCounts(); // Also refresh program counts
            setSelectedUser(null);
            setSelectedRoomForUser("");
        } catch (error) {
            setError(error.message);
        }
    };

    // Start a tournament
    const handleStartTournament = async () => {
        if (!selectedRoomForTournament) return;

        if (
            !window.confirm(
                `czy na pewno chcesz rozpocząć zawody dla klasy "${selectedRoomForTournament}"?`,
            )
        ) {
            return;
        }

        try {
            // First, get all the programs in this room (by user's classroom)
            const roomPrograms = programs.filter(
                (p) => p.room === selectedRoomForTournament,
            );

            if (roomPrograms.length < 2) {
                setError(
                    "potrzeba co najmniej 2 programów w klasie do przeprowadzenia zawodów",
                );
                return;
            }

            setTournamentStatus({
                inProgress: true,
                id: null,
                progress: 0,
                message: "rozpoczynanie zawodów...",
            });

            const response = await fetch(
                `${API_URL}/api/admin/start-tournament`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: localStorage.getItem("token"),
                    },
                    body: JSON.stringify({ roomId: selectedRoomForTournament }),
                },
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(
                    data.error || "nie udało się rozpocząć zawodów",
                );
            }

            const data = await response.json();

            setTournamentStatus({
                inProgress: true,
                id: data.tournamentId,
                progress: 5,
                message: `zawody rozpoczęte. ${data.totalMatches} gier do rozegrania.`,
            });

            // Start polling for tournament progress
            pollTournamentStatus(data.tournamentId);
        } catch (error) {
            setError(error.message);
            setTournamentStatus({
                inProgress: false,
                id: null,
                progress: 0,
                message: "",
            });
        }
    };

    const fetchLeaderboard = async (tournamentId) => {
        try {
            const response = await fetch(
                `${API_URL}/api/admin/tournaments/${tournamentId}/results`,
                {
                    headers: {
                        Authorization: localStorage.getItem("token"),
                    },
                },
            );

            if (!response.ok) {
                throw new Error("Failed to fetch leaderboard");
            }

            const data = await response.json();
            setLeaderboard(data.results || []);
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            setError("Failed to load leaderboard");
        }
    };

    // Poll for tournament status updates
    const pollTournamentStatus = async (tournamentId) => {
        try {
            const response = await fetch(
                `${API_URL}/api/admin/tournaments/${tournamentId}/status`,
                {
                    headers: {
                        Authorization: localStorage.getItem("token"),
                    },
                },
            );

            if (!response.ok) {
                throw new Error("nie udało się pobrać statusu zawodów");
            }

            const data = await response.json();

            setTournamentStatus((prev) => ({
                ...prev,
                progress: data.progress,
                message:
                    data.status === "completed"
                        ? "zawody zakończone!"
                        : "w trakcie... ", // ${data.progress}% ukończone`,
            }));

            // If tournament is still in progress, poll again after 5 seconds
            if (data.status === "in_progress") {
                setTimeout(() => pollTournamentStatus(tournamentId), 5000);
            } else {
                // Tournament is completed or failed
                setTournamentStatus((prev) => ({
                    ...prev,
                    inProgress: false,
                    message:
                        data.status === "completed"
                            ? "zawody zakończone!"
                            : `błąd: ${data.error || "wystąpił problem podczas zawodów"}`,
                }));

                // If completed, fetch the leaderboard
                if (data.status === "completed") {
                    fetchLeaderboard(tournamentId);
                }
            }
        } catch (error) {
            console.error("Error polling tournament status:", error);
            setTournamentStatus((prev) => ({
                ...prev,
                message: `błąd: ${error.message}`,
            }));
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

    const fetchRoomTournaments = async (roomId) => {
        try {
            const response = await fetch(
                `${API_URL}/api/admin/rooms/${roomId}/tournaments`,
                {
                    headers: {
                        Authorization: localStorage.getItem("token"),
                    },
                },
            );

            if (!response.ok) {
                throw new Error("Failed to fetch tournaments");
            }

            const data = await response.json();
            setRoomTournaments(data.tournaments || []);

            // If there's a tournament, automatically select it
            if (data.tournaments && data.tournaments.length > 0) {
                const latestTournament = data.tournaments[0]; // First is most recent
                setTournamentStatus({
                    inProgress: latestTournament.status === "in_progress",
                    id: latestTournament.id,
                    progress: calculateProgress(latestTournament),
                    message:
                        latestTournament.status === "in_progress"
                            ? `w trakcie... ${calculateProgress(latestTournament)}% ukończone`
                            : "zawody zakończone!",
                });

                // If tournament is completed, fetch leaderboard
                if (latestTournament.status === "completed") {
                    fetchLeaderboard(latestTournament.id);
                } else if (latestTournament.status === "in_progress") {
                    // Start polling for in-progress tournament
                    pollTournamentStatus(latestTournament.id);
                }
            }
        } catch (error) {
            console.error("Error fetching room tournaments:", error);
            setError("Failed to load tournaments");
        }
    };

    // Helper function to calculate progress
    const calculateProgress = (tournament) => {
        if (!tournament || tournament.total_matches === 0) return 0;
        return Math.round(
            (tournament.completed_matches / tournament.total_matches) * 100,
        );
    };

    // Add this function to kill a tournament
    const killTournament = async (tournamentId) => {
        if (
            !window.confirm(
                "Czy na pewno chcesz usunąć te zawody? Ta akcja jest nieodwracalna.",
            )
        ) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/api/admin/tournaments/${tournamentId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: localStorage.getItem("token"),
                    },
                },
            );

            if (!response.ok) {
                throw new Error("Failed to delete tournament");
            }

            // Refresh tournaments list
            fetchRoomTournaments(selectedRoomForTournament);

            // Reset tournament status if we were viewing this tournament
            if (tournamentStatus.id === tournamentId) {
                setTournamentStatus({
                    inProgress: false,
                    id: null,
                    progress: 0,
                    message: "Zawody zostały anulowane",
                });
                setLeaderboard([]);
            }
        } catch (error) {
            console.error("Error killing tournament:", error);
            setError("Failed to delete tournament");
        }
    };

    const handleUpdateUserRole = async (userId, newRole) => {
        if (
            !window.confirm(
                `czy na pewno chcesz zmienić rolę tego użytkownika na "${newRole}"?`,
            )
        ) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/api/admin/users/${userId}/role`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: localStorage.getItem("token"),
                    },
                    body: JSON.stringify({ role: newRole }),
                },
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "failed to update user role");
            }

            await fetchUsers();
            setSelectedUser(null);
            setError(null);
        } catch (error) {
            setError(error.message);
        }
    };

    const handleDeleteUser = async (userId, username) => {
        if (
            !window.confirm(
                `czy na pewno chcesz usunąć użytkownika "${username}"? Ta akcja jest nieodwracalna.`,
            )
        ) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/api/admin/users/${userId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: localStorage.getItem("token"),
                    },
                },
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "failed to delete user");
            }

            await fetchUsers();
            await fetchPrograms();
            await fetchStudentCounts();
            await fetchProgramCounts();
            setSelectedUser(null);
            setError(null);
        } catch (error) {
            setError(error.message);
        }
    };

    const currentUser = JSON.parse(localStorage.getItem("user"));
    const isProfessor = currentUser && currentUser.username === "profesor";

    return (
        <>
            <AdminNavBar />
            <div className="admin-container">
                <div className="admin-sidebar">
                    <ul>
                        <li
                            className={
                                activeTab === "dashboard" ? "active" : ""
                            }
                            onClick={() => setActiveTab("dashboard")}
                        >
                            dashboard
                        </li>
                        <li
                            className={activeTab === "users" ? "active" : ""}
                            onClick={() => setActiveTab("users")}
                        >
                            użytkownicy
                        </li>
                        <li
                            className={activeTab === "rooms" ? "active" : ""}
                            onClick={() => setActiveTab("rooms")}
                        >
                            klasy
                        </li>
                        <li
                            className={activeTab === "programs" ? "active" : ""}
                            onClick={() => setActiveTab("programs")}
                        >
                            programy
                        </li>
                        <li
                            className={
                                activeTab === "tournaments" ? "active" : ""
                            }
                            onClick={() => setActiveTab("tournaments")}
                        >
                            zawody
                        </li>
                        <li onClick={() => navigate("/welcome")}>
                            powrót do aplikacji
                        </li>
                    </ul>
                </div>

                <div className="admin-content">
                    {error && <div className="admin-error">{error}</div>}

                    {activeTab === "dashboard" && (
                        <div className="admin-dashboard">
                            <h2>{currentUser?.username}</h2>
                            <div className="admin-stats">
                                <div className="admin-stat-card">
                                    <h3>użytkownicy</h3>
                                    <div className="admin-stat-value">
                                        {users.length}
                                    </div>
                                </div>
                                <div className="admin-stat-card">
                                    <h3>klasy</h3>
                                    <div className="admin-stat-value">
                                        {rooms.length}
                                    </div>
                                </div>
                                <div className="admin-stat-card">
                                    <h3>programy</h3>
                                    <div className="admin-stat-value">
                                        {programs.length}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "users" && (
                        <div className="admin-users">
                            <h2>zarządzanie użytkownikami</h2>

                            <div className="admin-section">
                                <h3>przypisz użytkownika do klasy</h3>
                                <div className="admin-form">
                                    <div className="admin-form-row">
                                        <label>użytkownik:</label>
                                        <select
                                            value={
                                                selectedUser
                                                    ? selectedUser.id
                                                    : ""
                                            }
                                            onChange={(e) => {
                                                const userId = e.target.value;
                                                const user = users.find(
                                                    (u) =>
                                                        u.id.toString() ===
                                                        userId,
                                                );
                                                setSelectedUser(user);
                                                setSelectedRoomForUser(
                                                    user?.classroom || "",
                                                );
                                            }}
                                        >
                                            <option value="">
                                                wybierz użytkownika
                                            </option>
                                            {users.map((user) => (
                                                <option
                                                    key={user.id}
                                                    value={user.id}
                                                >
                                                    {user.username} ({user.role}
                                                    )
                                                    {user.classroom &&
                                                        ` - ${user.classroom}`}
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
                                                    onChange={(e) =>
                                                        setSelectedRoomForUser(
                                                            e.target.value,
                                                        )
                                                    }
                                                >
                                                    <option value="">
                                                        brak przypisania
                                                    </option>
                                                    {rooms.map((room) => (
                                                        <option
                                                            key={room.id}
                                                            value={room.room_id}
                                                        >
                                                            {room.room_id}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <button
                                                onClick={
                                                    handleUpdateUserClassroom
                                                }
                                            >
                                                {selectedRoomForUser
                                                    ? `przypisz do ${selectedRoomForUser}`
                                                    : "usuń przypisanie"}
                                            </button>

                                            {/* Opcje tylko dla profesora */}
                                            {isProfessor && (
                                                <div className="professor-options">
                                                    <hr
                                                        style={{
                                                            margin: "20px 0",
                                                        }}
                                                    />
                                                    {/* <h4>opcje profesora</h4> */}

                                                    <div className="admin-form-row">
                                                        <label>
                                                            zmień rolę na:
                                                        </label>
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                gap: "10px",
                                                                marginTop:
                                                                    "5px",
                                                            }}
                                                        >
                                                            <button
                                                                onClick={() =>
                                                                    handleUpdateUserRole(
                                                                        selectedUser.id,
                                                                        "student",
                                                                    )
                                                                }
                                                                disabled={
                                                                    selectedUser.role ===
                                                                    "student"
                                                                }
                                                                className={
                                                                    selectedUser.role ===
                                                                    "student"
                                                                        ? "disabled-button"
                                                                        : "role-button"
                                                                }
                                                            >
                                                                student
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    handleUpdateUserRole(
                                                                        selectedUser.id,
                                                                        "admin",
                                                                    )
                                                                }
                                                                disabled={
                                                                    selectedUser.role ===
                                                                    "admin"
                                                                }
                                                                className={
                                                                    selectedUser.role ===
                                                                    "admin"
                                                                        ? "disabled-button"
                                                                        : "role-button"
                                                                }
                                                            >
                                                                admin
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* <div
                                                        className="admin-form-row"
                                                        style={{
                                                            marginTop: "20px",
                                                        }}
                                                    >
                                                        <button
                                                            onClick={() =>
                                                                handleDeleteUser(
                                                                    selectedUser.id,
                                                                    selectedUser.username,
                                                                )
                                                            }
                                                            className="admin-delete-button"
                                                            style={{
                                                                backgroundColor:
                                                                    "#dc3545",
                                                                color: "white",
                                                            }}
                                                        >
                                                            usuń użytkownika
                                                        </button>
                                                    </div> */}
                                                </div>
                                            )}
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
                                        {users.map((user) => (
                                            <tr key={user.id}>
                                                <td>{user.id}</td>
                                                <td>{user.username}</td>
                                                <td>
                                                    <span
                                                        className={`role-badge role-${user.role}`}
                                                    >
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td>{user.classroom || "-"}</td>
                                                <td>
                                                    {new Date(
                                                        user.created_at,
                                                    ).toLocaleString()}
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(
                                                                user,
                                                            );
                                                            setSelectedRoomForUser(
                                                                user.classroom ||
                                                                    "",
                                                            );
                                                        }}
                                                    >
                                                        edytuj
                                                    </button>
                                                    {isProfessor && (
                                                        <button
                                                            onClick={() =>
                                                                handleDeleteUser(
                                                                    user.id,
                                                                    user.username,
                                                                )
                                                            }
                                                            className="admin-delete-button"
                                                            style={{
                                                                marginLeft:
                                                                    "5px",
                                                            }}
                                                        >
                                                            usuń
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "rooms" && (
                        <div className="admin-rooms">
                            <h2>zarządzanie klasami</h2>

                            <div className="admin-section">
                                <h3>dodaj nową klasę</h3>
                                <form
                                    onSubmit={handleCreateRoom}
                                    className="admin-form"
                                >
                                    <div className="admin-form-row">
                                        <label>id klasy:</label>
                                        <input
                                            type="text"
                                            value={newRoom.roomId}
                                            onChange={(e) =>
                                                setNewRoom({
                                                    ...newRoom,
                                                    roomId: e.target.value,
                                                })
                                            }
                                            required
                                            placeholder="np. 2A, 3B, itd."
                                        />
                                    </div>

                                    <div className="admin-form-row">
                                        <label>opis:</label>
                                        <input
                                            type="text"
                                            value={newRoom.description}
                                            onChange={(e) =>
                                                setNewRoom({
                                                    ...newRoom,
                                                    description: e.target.value,
                                                })
                                            }
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
                                            <th>liczba programów</th>{" "}
                                            {/* New column */}
                                            <th>akcje</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rooms.map((room) => (
                                            <tr key={room.id}>
                                                <td>{room.id}</td>
                                                <td>{room.room_id}</td>
                                                <td>
                                                    {room.description || "-"}
                                                </td>
                                                <td>
                                                    {room.created_by_username ||
                                                        "-"}
                                                </td>
                                                <td>
                                                    {new Date(
                                                        room.created_at,
                                                    ).toLocaleString()}
                                                </td>
                                                <td>
                                                    {studentCounts[
                                                        room.room_id
                                                    ] || 0}
                                                </td>
                                                <td>
                                                    {programCounts[
                                                        room.room_id
                                                    ] || 0}
                                                </td>{" "}
                                                {/* New cell */}
                                                <td>
                                                    <button
                                                        onClick={() =>
                                                            handleDeleteRoom(
                                                                room.room_id,
                                                            )
                                                        }
                                                        className="admin-delete-button"
                                                    >
                                                        usuń
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "programs" && (
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
                                        {programs.map((program) => (
                                            <tr key={program.name}>
                                                <td>{program.name}</td>
                                                <td>{program.room || "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "tournaments" && (
                        <div className="admin-tournaments">
                            <h2>zawody klasowe</h2>

                            <div className="admin-section">
                                <h3>rozpocznij nowe zawody</h3>
                                <p>
                                    wybierz klasę, dla której chcesz
                                    przeprowadzić zawody
                                </p>

                                <div className="admin-form-row">
                                    <label>klasa:</label>
                                    <select
                                        value={selectedRoomForTournament}
                                        onChange={(e) =>
                                            setSelectedRoomForTournament(
                                                e.target.value,
                                            )
                                        }
                                        disabled={tournamentStatus.inProgress}
                                    >
                                        <option value="">
                                            -- wybierz klasę --
                                        </option>
                                        {rooms.map((room) => {
                                            const programsInRoom =
                                                programs.filter(
                                                    (p) =>
                                                        p.room === room.room_id,
                                                );

                                            return (
                                                <option
                                                    key={room.id}
                                                    value={room.room_id}
                                                    disabled={
                                                        programsInRoom.length <
                                                        2
                                                    }
                                                >
                                                    {room.room_id} (
                                                    {programsInRoom.length}{" "}
                                                    programów)
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <button
                                    className="tournament-button"
                                    onClick={handleStartTournament}
                                    disabled={
                                        !selectedRoomForTournament ||
                                        tournamentStatus.inProgress
                                    }
                                >
                                    rozpocznij zawody
                                </button>

                                {tournamentStatus.inProgress && (
                                    <div className="tournament-status">
                                        <p>{tournamentStatus.message}</p>
                                        <button
                                            onClick={() =>
                                                killTournament(
                                                    tournamentStatus.id,
                                                )
                                            }
                                            className="admin-delete-button"
                                        >
                                            przerwij zawody
                                        </button>
                                    </div>
                                )}

                                {tournamentStatus.inProgress === false &&
                                    leaderboard.length > 0 && (
                                        <div className="tournament-leaderboard">
                                            <h3>Wyniki zawodów</h3>
                                            <table className="admin-table">
                                                <thead>
                                                    <tr>
                                                        <th>Miejsce</th>
                                                        <th>Program</th>
                                                        <th>Punkty</th>
                                                        <th>Wygrane</th>
                                                        <th>Remisy</th>
                                                        <th>Przegrane</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {leaderboard.map(
                                                        (result, index) => (
                                                            <tr key={result.id}>
                                                                <td>
                                                                    {index + 1}
                                                                </td>
                                                                <td>
                                                                    {
                                                                        result.player
                                                                    }
                                                                </td>
                                                                <td>
                                                                    {
                                                                        result.points
                                                                    }
                                                                </td>
                                                                <td>
                                                                    {
                                                                        result.wins
                                                                    }
                                                                </td>
                                                                <td>
                                                                    {
                                                                        result.draws
                                                                    }
                                                                </td>
                                                                <td>
                                                                    {
                                                                        result.losses
                                                                    }
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                            </div>

                            {/* Tournament list section */}
                            {/* {selectedRoomForTournament &&
                                roomTournaments.length > 0 && (
                                    <div className="admin-section">
                                        <h3>
                                            aktywne i zakończone zawody dla
                                            klasy {selectedRoomForTournament}
                                        </h3>
                                        <div className="admin-table-container">
                                            <table className="admin-table">
                                                <thead>
                                                    <tr>
                                                        <th>ID</th>
                                                        <th>Status</th>
                                                        <th>Postęp</th>
                                                        <th>
                                                            Data rozpoczęcia
                                                        </th>
                                                        <th>
                                                            Data zakończenia
                                                        </th>
                                                        <th>Akcje</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {roomTournaments.map(
                                                        (tournament) => {
                                                            const progress =
                                                                tournament.total_matches >
                                                                0
                                                                    ? Math.round(
                                                                          (tournament.completed_matches /
                                                                              tournament.total_matches) *
                                                                              100,
                                                                      )
                                                                    : 0;

                                                            return (
                                                                <tr
                                                                    key={
                                                                        tournament.id
                                                                    }
                                                                >
                                                                    <td>
                                                                        {
                                                                            tournament.id
                                                                        }
                                                                    </td>
                                                                    <td>
                                                                        {tournament.status ===
                                                                        "in_progress"
                                                                            ? "w trakcie"
                                                                            : tournament.status ===
                                                                                "completed"
                                                                              ? "zakończone"
                                                                              : tournament.status}
                                                                    </td>
                                                                    <td>
                                                                        <div className="tournament-progress-small">
                                                                            <div
                                                                                className="tournament-progress-bar"
                                                                                style={{
                                                                                    width: `${progress}%`,
                                                                                }}
                                                                            ></div>
                                                                            <span>
                                                                                {
                                                                                    progress
                                                                                }

                                                                                %
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        {new Date(
                                                                            tournament.created_at,
                                                                        ).toLocaleString()}
                                                                    </td>
                                                                    <td>
                                                                        {tournament.completed_at
                                                                            ? new Date(
                                                                                  tournament.completed_at,
                                                                              ).toLocaleString()
                                                                            : "-"}
                                                                    </td>
                                                                    <td>
                                                                        <button
                                                                            onClick={() => {
                                                                                // View tournament results
                                                                                setTournamentStatus(
                                                                                    {
                                                                                        inProgress:
                                                                                            tournament.status ===
                                                                                            "in_progress",
                                                                                        id: tournament.id,
                                                                                        progress:
                                                                                            progress,
                                                                                        message:
                                                                                            tournament.status ===
                                                                                            "in_progress"
                                                                                                ? `w trakcie... ${progress}% ukończone`
                                                                                                : "zawody zakończone!",
                                                                                    },
                                                                                );

                                                                                // Start polling if in progress
                                                                                if (
                                                                                    tournament.status ===
                                                                                    "in_progress"
                                                                                ) {
                                                                                    pollTournamentStatus(
                                                                                        tournament.id,
                                                                                    );
                                                                                } else if (
                                                                                    tournament.status ===
                                                                                    "completed"
                                                                                ) {
                                                                                    fetchLeaderboard(
                                                                                        tournament.id,
                                                                                    );
                                                                                }
                                                                            }}
                                                                            // className="view-button"
                                                                            style={{ marginRight: "10px" }}
                                                                        >
                                                                            pokaż
                                                                        </button>

                                                                        <button
                                                                            onClick={() =>
                                                                                killTournament(
                                                                                    tournament.id,
                                                                                )
                                                                            }
                                                                            className="admin-delete-button"
                                                                        >
                                                                            usuń
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        },
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )} */}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default AdminPanel;
