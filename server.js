const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000; // Use port 3000 for Render

// Enable CORS for specific origin
app.use(cors({
    origin: 'https://southafrica.blsspainglobal.com',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
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

    res.status(200).json({ token, shareableLink });
});

// Endpoint to retrieve session data and automate the session
app.get('/share', (req, res) => {
    const token = req.query.token;
    const sessionData = sessions[token];

    if (!token || !sessionData) {
        console.error('Invalid or expired token:', token);
        return res.status(404).send('Invalid or expired token');
    }

    // Return an HTML page with JavaScript to restore the session
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Continue Session</title>
            <script>
                // Restore cookies
                document.cookie = ${JSON.stringify(sessionData.cookies)};

                // Restore form data
                const formData = ${JSON.stringify(sessionData.formData)};
                Object.keys(formData).forEach(name => {
                    const element = document.querySelector(\`[name="\${name}"]\`);
                    if (element) {
                        element.value = formData[name];
                    }
                });

                // Redirect to the original URL
                window.location.href = ${JSON.stringify(sessionData.url)};
            </script>
        </head>
        <body>
            <p>Redirecting to continue your session...</p>
        </body>
        </html>
    `);
});

// Endpoint to handle incoming data (for Telegram notifications, optional)
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

        // Send the message to Telegram (optional)
        // await sendTelegramMessage(message);

        // Respond to the client
        res.status(200).send('Data received and Telegram notification sent successfully');
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('Internal Server Error');
    }
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

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
