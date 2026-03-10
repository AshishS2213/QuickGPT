import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
    let token = req.headers.authorization;

    // Handle both "Bearer <token>" and raw token formats
    if (token?.startsWith('Bearer ')) {
        token = token.slice(7);
    }

    if (!token) {
        return res.status(401).json({success: false, message: 'Not authorized, no token'});
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const user = await User.findById(userId)

        if(!user){
            return res.json({success: false, message: "User not found"});
        }

        // CREDIT SYSTEM DISABLED — Force credits to always be 20000
        // regardless of what value is stored in the database
        user.credits = 20000;

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({success: false, message: 'Not authorized, token failed'});
    }
}