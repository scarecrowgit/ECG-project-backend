const express = require('express');
const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// Example Routes
app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to the API!' });
});

app.post('/api/ecg-data', (req, res) => {
    const data = req.body;

    if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({
            message: 'Invalid data format. Expected a non-empty array of ECG data points.'
        });
    }

    console.log('Received ECG data:', data);

    res.json({
        message: 'ECG data received successfully!',
        receivedData: data,
    });
});

// Start the Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});