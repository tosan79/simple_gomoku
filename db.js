const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, "codingomoku.db");
const db = new sqlite3.Database(dbPath, () => {
    console.log("Connected to database successfully");
});


const initDb = () => {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS users(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'student',
                classroom TEXT DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS programs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                code TEXT NOT NULL,
                owner_id INTEGER,
                compiled_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_id) REFERENCES users (id),
                FOREIGN KEY (room_id) REFERENCES rooms (room_id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id TEXT UNIQUE NOT NULL,
                description TEXT,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        `);

        console.log("Database schema initialized");
    });
};


initDb();

const dbRun = (sql, params = []) => {
    return new Promise((res, rej) => {
        db.run(sql, params, function(err) {
            if (err) {
                rej(err);
                return;
            }
            res({id: this.lastID, changes: this.changes});
        });
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((res, rej) => {
        db.get(sql, params, function(err, row) {
            if (err) {
                rej(err);
                return;
            }
            res(row);
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((res, rej) => {
        db.all(sql, params, function(err, rows) {
            if (err) {
                rej(err);
                return;
            }
            res(rows);
        });
    });
};

(function initTournamentTables() {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS tournaments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id TEXT NOT NULL,
                status TEXT NOT NULL,
                total_matches INTEGER NOT NULL,
                completed_matches INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                FOREIGN KEY (room_id) REFERENCES rooms (room_id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS tournament_matches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_id INTEGER NOT NULL,
                player1 TEXT NOT NULL,
                player2 TEXT NOT NULL,
                winner TEXT,
                moves TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS tournament_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_id INTEGER NOT NULL,
                player TEXT NOT NULL,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                draws INTEGER DEFAULT 0,
                points REAL DEFAULT 0,
                FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
            )
        `);

        console.log("Tournament tables initialized");
    })
})();


module.exports = {
    db,
    dbRun,
    dbGet,
    dbAll
};
