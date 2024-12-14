const express = require('express');
const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// Example Routes
app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to the API!' });
});

app.post('/api/data', (req, res) => {
    const data = req.body;
    res.json({
        message: 'Data received successfully!',
        receivedData: data,
    });
});

// Start the Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});