const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const cors = require('cors'); // Add this line

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for specific origin
app.use(cors({
    origin: 'https://southafrica.blsspainglobal.com', // Allow requests from this origin
    methods: ['GET', 'POST'], // Allow only GET and POST requests
    credentials: true, // Allow cookies and credentials
}));

// Middleware to parse URL-encoded and JSON data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Telegram Configuration
const botToken = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN'; // Replace with your bot token
const chatId = process.env.CHAT_ID || 'YOUR_CHAT_ID'; // Replace with your chat ID

// Function to send a message to Telegram
async function sendTelegramMessage(message) {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const params = new URLSearchParams({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown', // Optional: Use Markdown formatting
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
        });

        const data = await response.json();
        console.log('Telegram API Response:', data); // Log the response

        if (!data.ok) {
            console.error('Failed to send Telegram message:', data);
        }
    } catch (error) {
        console.error('Error sending Telegram message:', error);
    }
}

// Store session data in memory (replace with a database in production)
const sessions = {};

// Endpoint to generate a shareable token
app.post('/generate-token', (req, res) => {
    const sessionData = req.body; // Session data from the client
    const token = Math.random().toString(36).substring(2, 15); // Generate a random token
    sessions[token] = sessionData; // Store session data

    const shareableLink = `https://test-em43.onrender.com/share?token=${token}`; // Shareable link
    res.status(200).json({ token, shareableLink });
});

// Endpoint to retrieve session data using a token
app.get('/share', (req, res) => {
    const token = req.query.token;
    const sessionData = sessions[token];

    if (sessionData) {
        res.status(200).json(sessionData); // Return session data
    } else {
        res.status(404).send('Invalid or expired token');
    }
});

// Endpoint to handle incoming data (for Telegram notifications)
app.post('/telemetry', async (req, res) => {
    try {
        const {
            token,
            country,
            location,
            visaSubType,
            appointmentFor,
            category,
            timeOfSending,
            appointmentDate,
            slots
        } = req.body;

        // Log the received data
        console.log('Received data:', req.body);

        // Prepare the message for Telegram
        const message = `
📅 *New Appointment Slot Available!*
- *Appointment Date:* ${appointmentDate}
- *Available Slots:* ${slots}
- *Location:* ${location}
- *Category:* ${category}
- *Visa Subtype:* ${visaSubType}
- *Time of Sending:* ${timeOfSending}
        `;

        console.log('Sending message to Telegram:', message); // Log the message

        // Send the message to Telegram
        await sendTelegramMessage(message);

        // Respond to the client
        res.status(200).send('Data received and Telegram notification sent successfully');
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
