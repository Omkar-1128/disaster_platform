const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });
const activeConnections = new Set();

wss.on('connection', (ws) => {
  activeConnections.add(ws);
  
  ws.on('close', () => {
    activeConnections.delete(ws);
  });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // For serving static files

// API Routes
app.use('/', routes);

// Helper function to broadcast alerts
function broadcastAlert(alertData) {
  const message = JSON.stringify({
    type: 'ALERT',
    data: alertData
  });
  
  activeConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// Make broadcastAlert available to routes
app.locals.broadcastAlert = broadcastAlert;

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});