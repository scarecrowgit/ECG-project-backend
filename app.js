const express = require('express');
const { Pool } = require('pg');  // Import the PostgreSQL client
const app = express();

// PostgreSQL configuration
const pool = new Pool({
    user: 'postgres', // Your PostgreSQL username
    host: 'localhost',
    database: 'postgres', // Your database name
    password: '12345678910', // Your PostgreSQL password
    port: 5433,
});

// Middleware to parse JSON requests
app.use(express.json());

// Example Routes
app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to the API!' });
});

// Endpoint to receive ECG data and insert it into the database
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

// Start the Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});