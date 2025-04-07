const express = require('express');
const axios = require('axios');
const router = express.Router();
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// User Registration
router.post('/register', async (req, res) => {
    const { username, email, password, user_role } = req.body;

    if (!username || !email || !password || !user_role) {
        return res.status(400).json({ message: "All fields are required." });
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert into database
    const query = "INSERT INTO users (username, email, password_hash, user_role) VALUES (?, ?, ?, ?)";
    db.query(query, [username, email, passwordHash, user_role], (err, result) => {
        if (err) {
            console.error("❌ Error registering user:", err);
            return res.status(500).json({ message: "Server error", error: err });
        }
        console.log("✅ User registered successfully, ID:", result.insertId);
        res.json({ message: "User registered successfully!" });
    });
});

// User Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    // Fetch user from database
    const query = "SELECT * FROM users WHERE email = ?";
    db.query(query, [email], async (err, result) => {
        if (err) {
            console.error("❌ Error fetching user:", err);
            return res.status(500).json({ message: "Server error", error: err });
        }

        if (result.length === 0) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const user = result[0];

        // Compare hashed password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user.id, user_role: user.user_role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ message: "Login successful!", token, user_role: user.user_role, username: user.username });
    });
});

// Fetch user details
router.get('/user-details', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const query = "SELECT username FROM users WHERE id = ?";
        db.query(query, [userId], (err, result) => {
            if (err) {
                console.error("❌ Error fetching user details:", err);
                return res.status(500).json({ message: "Server error", error: err });
            }
            if (result.length === 0) {
                return res.status(404).json({ message: "User not found" });
            }
            res.json({ username: result[0].username });
        });
    } catch (error) {
        console.error("❌ Error verifying token:", error);
        res.status(401).json({ message: "Invalid token" });
    }
});

// Function to get lat/lng from OpenStreetMap Nominatim API
async function getCoordinates(location) {
    try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
            params: { q: location, format: "json" }
        });

        if (response.data.length > 0) {
            const { lat, lon } = response.data[0];
            return { lat: parseFloat(lat), lng: parseFloat(lon) };
        } else {
            console.warn(`⚠️ No coordinates found for ${location}`);
            return { lat: null, lng: null };
        }
    } catch (error) {
        console.error("❌ Error fetching coordinates:", error);
        return { lat: null, lng: null };
    }
}

// Route to handle disaster reporting
router.post('/report-disaster', async (req, res) => {
    const { disasterType, requestType, location, description } = req.body;

    if (!disasterType || !requestType || !location || !description) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        // Get coordinates from OpenStreetMap
        const { lat, lng } = await getCoordinates(location);

        // Insert into help_requests table with coordinates
        const helpQuery = "INSERT INTO help_requests (user_role, request_type, disaster_type, location, lat, lng) VALUES (?, ?, ?, ?, ?, ?)";
        db.query(helpQuery, ['Victim', requestType, disasterType, location, lat, lng], (err, result) => {
            if (err) {
                console.error("❌ Error inserting help request:", err);
                return res.status(500).json({ message: "Database error", error: err });
            }
            
            // Broadcast alert to all connected clients
            const alertData = {
                id: result.insertId,
                disasterType,
                location,
                requestType,
                timestamp: new Date().toISOString(),
                coordinates: { lat, lng }
            };
            
            req.app.locals.broadcastAlert(alertData);
            
            console.log("✅ Help request stored and alert broadcasted, ID:", result.insertId);
            res.json({ message: "Disaster reported successfully!" });
        });
    } catch (error) {
        console.error("❌ Error in report-disaster:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// Route to fetch reported disasters
router.get('/reported-disasters', (req, res) => {
    const query = "SELECT disasterType, location, description, reportedAt, lat, lng FROM disaster_reports ORDER BY reportedAt DESC";
    db.query(query, (err, result) => {
        if (err) {
            console.error("❌ Error fetching reported disasters:", err);
            return res.status(500).json({ message: "Server error", error: err });
        }
        res.json(result);
    });
});

// Handle new help requests
router.post('/request-help', async (req, res) => {
    console.log("📩 Help Request Received:", req.body);
    const { user_role, request_type, disaster_type, location } = req.body;

    if (!user_role || !request_type || !disaster_type || !location) {
        return res.status(400).json({ message: "All fields are required." });
    }

    // Get lat/lng from Nominatim API
    const { lat, lng } = await getCoordinates(location);

    // Insert into database
    const query = "INSERT INTO help_requests (user_role, request_type, disaster_type, location, lat, lng) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(query, [user_role, request_type, disaster_type, location, lat, lng], (err, result) => {
        if (err) {
            console.error("❌ Error inserting request:", err);
            return res.status(500).json({ message: "Server error", error: err });
        }
        console.log("✅ Help request stored in database, ID:", result.insertId);
        res.json({ message: "Help request submitted successfully!" });
    });
});

// Get All Help Requests for Map and Table
router.get('/all-help-requests', (req, res) => {
    console.log("📊 Fetching all help requests...");

    db.query("SELECT id, user_role, request_type, disaster_type, location, lat, lng, created_at FROM help_requests ORDER BY created_at DESC", 
    (err, result) => {
        if (err) {
            console.error("❌ Error fetching help requests:", err);
            return res.status(500).json({ message: "Server error", error: err });
        }
        console.log(`✅ Total requests fetched: ${result.length}`);
        res.json(result);
    });
});

// Get Help Request Count
router.get('/help-count', (req, res) => {
    db.query("SELECT COUNT(*) AS count FROM help_requests", (err, result) => {
        if (err) {
            console.error("❌ Error fetching help count:", err);
            return res.status(500).json({ message: "Server error", error: err });
        }
        res.json({ count: result[0].count });
    });
});


// wheather api
const WEATHER_API_KEY = '79191ad6fd974e269cc134631250204'; // Apni API key daalein

// Current weather endpoint
router.get('/current-weather', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        
        const response = await axios.get(
            `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lng}`
        );

        res.json({
            name: response.data.location.name,
            country: response.data.location.country,
            temp: response.data.current.temp_c,
            weather: response.data.current.condition,
            main: {
                temp: response.data.current.temp_c,
                humidity: response.data.current.humidity
            },
            wind: {
                speed: response.data.current.wind_kph
            },
            weather: [{
                main: response.data.current.condition.text,
                description: response.data.current.condition.text,
                icon: response.data.current.condition.icon.replace('64x64', '128x128')
            }]
        });
    } catch (error) {
        console.error("Weather data error:", error);
        res.status(500).json({ error: "Unable to fetch weather data" });
    }
});

// Weather alerts endpoint
router.get('/weather-alerts', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        
        const response = await axios.get(
            `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${lat},${lng}&days=2&alerts=yes`
        );

        if (response.data.alerts && response.data.alerts.alert) {
            res.json(response.data.alerts.alert.map(alert => ({
                event: alert.headline,
                description: alert.desc,
                severity: alert.severity,
                start: alert.effective_epoch,
                end: alert.expires_epoch
            })));
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error("Weather alerts error:", error);
        res.status(500).json({ error: "Unable to fetch weather alerts" });
    }
});

module.exports = router;