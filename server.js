const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000; // Use Render's provided port or default to 3000

// Middleware to parse URL-encoded data
app.use(bodyParser.urlencoded({ extended: true }));

// Telegram Configuration
const botToken = '7462569364:AAFopBu0YGk8EMPhxDDGrkiNhkqEC8F0XDM'; // Replace with your bot token
const chatId = -1002406480101; // Replace with your chat ID

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

// Endpoint to handle incoming data
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
