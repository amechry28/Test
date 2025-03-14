const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // For generating unique tokens

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all origins (for testing)
app.use(cors({
  origin: '*', // Allow all origins (update this for production)
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Middleware to parse URL-encoded and JSON data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Store session data in memory (replace with a database in production)
const sessions = {};

// Clean up expired sessions every hour
setInterval(() => {
  const now = new Date();
  Object.keys(sessions).forEach(token => {
    const session = sessions[token];
    const sessionAge = now - new Date(session.timestamp);
    if (sessionAge > 3600000) { // 1 hour in milliseconds
      delete sessions[token];
      console.log(`Deleted expired session: ${token}`);
    }
  });
}, 3600000); // Run every hour

// Endpoint to generate a shareable token
app.post('/generate-token', (req, res) => {
  try {
    const { url, cookies, formData } = req.body;

    if (!url || !cookies || !formData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sessionData = {
      url, // URL of the current page
      cookies, // Cookies from the target website
      formData, // Form data (if any)
      timestamp: new Date().toISOString(), // Timestamp for tracking
    };

    const token = uuidv4(); // Generate a unique token
    sessions[token] = sessionData; // Store session data

    const shareableLink = `https://test-em43.onrender.com/share?token=${token}`; // Shareable link
    console.log("Generated token:", token); // Log the token
    console.log("Generated shareable link:", shareableLink); // Log the shareable link

    res.status(200).json({ token, shareableLink });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to retrieve session data and automate the session
app.get('/share', (req, res) => {
  try {
    const token = req.query.token;
    const sessionData = sessions[token];

    if (!sessionData) {
      return res.status(404).send('Invalid or expired token');
    }

    // Check if the token has expired
    const sessionAge = new Date() - new Date(sessionData.timestamp);
    if (sessionAge > 3600000) { // 1 hour in milliseconds
      return res.status(404).send('Token expired');
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
          }, 1000); // 1-second delay
        </script>
      </head>
      <body>
        <p>Redirecting to continue your session...</p>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error retrieving session data:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
