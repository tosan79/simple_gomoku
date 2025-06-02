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

const bcrypt = require('bcrypt');

// Create admin user if it doesn't exist
const createAdminIfNotExists = async () => {
    try {
        const adminUser = await dbGet('SELECT * FROM users WHERE role = "admin" LIMIT 1');

        if (!adminUser) {
            console.log('Creating default admin user...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await dbRun(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                ['admin', hashedPassword, 'admin']
            );
            console.log('Default admin user created: admin/admin123');
        }
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
};

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
                room_id TEXT,
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
createAdminIfNotExists();

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

function dbGet(sql, params = []) {
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

const addForeignKeyConstraint = async () => {
    try {
        // Enable foreign keys
        await dbRun('PRAGMA foreign_keys = ON;');

        // Begin transaction
        await dbRun('BEGIN TRANSACTION;');

        // Create new table with constraint
        await dbRun(`
            CREATE TABLE users_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'student',
                classroom TEXT DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (classroom) REFERENCES rooms(room_id) ON DELETE SET NULL ON UPDATE CASCADE
            );
        `);

        // Copy data
        await dbRun(`
            INSERT INTO users_new (id, username, password, role, classroom, created_at)
            SELECT id, username, password, role, classroom, created_at FROM users;
        `);

        // Drop old table
        await dbRun('DROP TABLE users;');

        // Rename new table
        await dbRun('ALTER TABLE users_new RENAME TO users;');

        // Commit transaction
        await dbRun('COMMIT;');

        console.log('Foreign key constraint added successfully');
    } catch (error) {
        // Rollback on error
        await dbRun('ROLLBACK;');
        console.error('Error adding foreign key constraint:', error);
    }
};

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

// db.run(`
//     ALTER TABLE tournament_matches ADD COLUMN player1_piece TEXT DEFAULT 'O'
// `);

module.exports = {
    db,
    dbRun,
    dbGet,
    dbAll
};
