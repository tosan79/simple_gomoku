const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { dbGet, dbRun } = require('./db');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const SALT_ROUNDS = 10;

// User operations
const createUser = async (username, password, role = 'student', classroom = null) => {
    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Insert the user
        const result = await dbRun(
            'INSERT INTO users (username, password, role, classroom) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, role, classroom]
        );

        return { id: result.id, username, role };
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

const findUserByUsername = async (username) => {
    try {
        return await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    } catch (error) {
        console.error('Error finding user:', error);
        throw error;
    }
};

const comparePassword = async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
};

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [decoded.id]);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Please authenticate' });
    }
};

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
    try {
        await authenticate(req, res, () => {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }
            next();
        });
    } catch (error) {
        res.status(403).json({ error: 'Admin access required' });
    }
};

module.exports = {
    createUser,
    findUserByUsername,
    comparePassword,
    generateToken,
    authenticate,
    authenticateAdmin
};
