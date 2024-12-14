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
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});