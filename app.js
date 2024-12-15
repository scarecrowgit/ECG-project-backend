const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt'); // Для хэширования паролей
const crypto = require('crypto'); // Для генерации уникального кода
const app = express();
const cors = require('cors');
require('dotenv').config();

// PostgreSQL configuration from .env file
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const corsOptions = {
    origin: process.env.FRONTEND_URL, // Разрешаем доступ с фронтенда
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
  
app.use(cors(corsOptions));

// Middleware to parse JSON requests
app.use(express.json());

// Example Routes
app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to the API!' });
});

// Function to generate a random 6-character unique code
const generateUserId = () => {
    return crypto.randomBytes(3).toString('hex').toUpperCase(); // Generates a 6-character hex code
};

// Endpoint for user registration
// POST /api/register
// Request body: { "login": "user_login", "password": "user_password" }
// Response: { "message": "User registered successfully!", "user_id": "random_user_id" }
app.post('/api/register', async (req, res) => {
    const { login, password } = req.body;

    // Validate input
    if (!login || !password) {
        return res.status(400).json({ message: 'Login and password are required.' });
    }

    try {
        // Check if the user already exists
        const userCheckQuery = 'SELECT user_id FROM users WHERE login = $1';
        const userCheckResult = await pool.query(userCheckQuery, [login]);
        if (userCheckResult.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists.' });
        }

        // Generate a random user_id (6-character unique code)
        const user_id = generateUserId();

        // Hash the password
        const pass_hash = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        const insertQuery = 'INSERT INTO users (user_id, login, pass_hash) VALUES ($1, $2, $3) RETURNING user_id';
        const result = await pool.query(insertQuery, [user_id, login, pass_hash]);

        res.json({
            message: 'User registered successfully!',
            user_id: result.rows[0].user_id,
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Error registering user.', error: error.message });
    }
});

// Endpoint for user login
// POST /api/login
// Request body: { "login": "user_login", "password": "user_password" }
// Response: { "message": "Login successful!", "user_id": "user_id" }
app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;

    // Validate input
    if (!login || !password) {
        return res.status(400).json({ message: 'Login and password are required.' });
    }

    try {
        // Fetch user from the database
        const fetchQuery = 'SELECT user_id, pass_hash FROM users WHERE login = $1';
        const result = await pool.query(fetchQuery, [login]);

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid login or password.' });
        }

        const { user_id, pass_hash } = result.rows[0];

        // Compare the provided password with the hashed password
        const isValidPassword = await bcrypt.compare(password, pass_hash);
        if (!isValidPassword) {
            return res.status(400).json({ message: 'Invalid login or password.' });
        }

        res.json({
            message: 'Login successful!',
            user_id,
        });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ message: 'Error logging in user.', error: error.message });
    }
});

// Endpoint for saving ECG data
// POST /api/ecg-data
// Request body: { "user_id": "user_id", "data": [{ "ecg_signal": 123, "timestamp": "2024-12-15T10:00:00Z" }, ...] }
// Response: { "message": "ECG data saved successfully!", "receivedData": [...data] }
app.post('/api/ecg-data', async (req, res) => {
    const { user_id, data } = req.body;

    // Validate the data format
    if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({
            message: 'Invalid data format. Expected a non-empty array of ECG data points.'
        });
    }

    if (!user_id) {
        return res.status(400).json({
            message: 'user_id is required.'
        });
    }

    console.log('Received ECG data for user:', user_id, data);

    // Prepare the insert query
    const insertQuery = `
        INSERT INTO ecg_data (user_id, ecg_signal, timestamp)
        VALUES ($1, $2, $3)
    `;

    // Loop through the data array and insert each ECG data point
    try {
        for (const dataPoint of data) {
            const { ecg_signal, timestamp } = dataPoint;
            await pool.query(insertQuery, [user_id, ecg_signal, timestamp]);
        }

        res.json({
            message: 'ECG data saved successfully!',
            receivedData: data,
        });
    } catch (error) {
        console.error('Error inserting data into database:', error);
        res.status(500).json({
            message: 'Error saving ECG data to the database.',
            error: error.message,
        });
    }
});

// Endpoint to fetch the last 5 minutes of ECG data for a given user_id
// GET /api/ecg-data?user_id=some_user_id
// Query Parameter: user_id (required)
// Response: { "message": "Successfully fetched ECG data.", "data": [{ "ecg_signal": 123, "timestamp": "2024-12-15T10:00:00Z" }, ...] }
app.get('/api/ecg-data', async (req, res) => {
    const { user_id } = req.query;

    // Validate user_id
    if (!user_id) {
        return res.status(400).json({
            message: 'user_id is required as a query parameter.',
        });
    }

    try {
        const currentTime = new Date();
        const cutoffTime = new Date(currentTime.getTime() - 15 * 1000);

        const fetchQuery = `
            SELECT ecg_signal, timestamp
            FROM ecg_data
            WHERE user_id = $1 AND timestamp >= $2
            ORDER BY timestamp DESC
        `;

        const result = await pool.query(fetchQuery, [user_id, cutoffTime.toISOString()]);

        res.json({
            message: 'Successfully fetched ECG data.',
            data: result.rows,
        });
    } catch (error) {
        console.error('Error fetching data from the database:', error);
        res.status(500).json({
            message: 'Error fetching ECG data from the database.',
            error: error.message,
        });
    }
});

const PORT = process.env.BACKEND_PORT || 8000; // Порт из .env или 8000 по умолчанию
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});