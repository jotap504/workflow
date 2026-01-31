const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const db = require('./db');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const categoryRoutes = require('./routes/categories');
const adminRoutes = require('./routes/admin');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/polls', require('./routes/polls'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/accounting', require('./routes/accounting'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/users', require('./routes/users'));

// Static Uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve Client Production Build
app.use(express.static(path.join(__dirname, '../client/dist')));

// API Ping for diagnostics
app.get('/api/ping', (req, res) => {
    res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log('[SOCKET] New client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('[SOCKET] Client disconnected');
    });
});

// React Router Catch-all (must be after API routes)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('[GLOBAL ERROR]', err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

if (process.env.NODE_ENV !== 'production') {
    server.listen(PORT, () => {
        console.log(`[SERVER] Success: Running on port ${PORT}`);
    });
}

module.exports = app;
