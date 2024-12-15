const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt'); // Для хэширования паролей
const crypto = require('crypto'); // Для генерации уникального кода
const app = express();
const cors = require('cors');

// PostgreSQL configuration
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '12345678910',
    port: 5433,
});

const corsOptions = {
    origin: 'http://localhost:3000', // Разрешаем доступ с фронтенда (можно использовать * для всех доменов)
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

// Other endpoints (e.g., ECG data handling)
// Existing endpoints are not modified
app.post('/api/ecg-data', async (req, res) => {
    const data = req.body;

    // Validate the data format
    if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({
            message: 'Invalid data format. Expected a non-empty array of ECG data points.'
        });
    }

    console.log('Received ECG data:', data);

    // Prepare the insert query
    const insertQuery = `
        INSERT INTO ecg_data (user_id, ecg_signal, timestamp)
        VALUES ($1, $2, $3)
    `;

    // Hardcode user_id for testing
    const user_id = 'test_user_id';

    // Loop through the data array and insert each ECG data point
    try {
        for (const dataPoint of data) {
            const { ecg_signal, timestamp } = dataPoint; // Now receiving timestamp
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
app.get('/api/ecg-data', async (req, res) => {
    const { user_id } = req.query;

    // Validate user_id
    if (!user_id) {
        return res.status(400).json({
            message: 'user_id is required as a query parameter.',
        });
    }

    try {
        // Get the current timestamp and calculate the cutoff time
        const currentTime = new Date();
        const cutoffTime = new Date(currentTime.getTime() - 5 * 60 * 1000);

        // Query to fetch the last 5 minutes of data for the given user_id
        const fetchQuery = `
            SELECT ecg_signal, timestamp
            FROM ecg_data
            WHERE user_id = $1 AND timestamp >= $2
            ORDER BY timestamp DESC
        `;

        // Execute the query
        const result = await pool.query(fetchQuery, [user_id, cutoffTime.toISOString()]);

        // Send the data as a response
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
// Start the Server
const PORT = 8000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});