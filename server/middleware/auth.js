const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

function verifyToken(req, res, next) {
    const tokenHeader = req.headers['authorization'];

    if (!tokenHeader) {
        return res.status(403).json({ auth: false, message: 'No token provided.' });
    }

    const token = tokenHeader.split(' ')[1]; // Bearer <token>

    console.log(`[AUTH DEBUG] Verifying token: ${token.substring(0, 10)}...`);

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('[AUTH DEBUG] JWT Verification Failed:', err.message);
            return res.status(500).json({ auth: false, message: 'Failed to authenticate token.', error: err.message });
        }

        console.log(`[AUTH DEBUG] Token verified for user: ${decoded.username} (${decoded.role})`);

        // Save to request for use in other routes
        req.userId = decoded.id;
        req.userName = decoded.username;
        req.userRole = decoded.role;
        next();
    });
}

module.exports = verifyToken;
