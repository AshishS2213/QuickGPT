import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import connectDB from './configs/db.js';
import contextMiddleware from './middlewares/contextMiddleware.js';
import userRouter from './routes/userRoutes.js';
import chatRouter from './routes/chatRoutes.js';
import messageRouter from './routes/messageRoutes.js';
import creditRouter from './routes/creditRoutes.js';
import { stripeWebhooks } from './controllers/webhooks.js';

const app = express();

await connectDB()

// Test endpoint to verify server is running
app.get('/api/test', (req, res) => {
    res.json({success: true, message: "Server is working", timestamp: new Date()});
});

// Stripe Webhooks - Raw middleware to capture all requests
app.post('/api/stripe', (req, res, next) => {
    console.log("🔔 POST /api/stripe received");
    console.log("Headers:", Object.keys(req.headers));
    console.log("Content-Type:", req.headers['content-type']);
    console.log("Stripe-Signature:", req.headers['stripe-signature'] ? 'Present' : 'Missing ❌');
    next();
}, express.raw({type: 'application/json'}), stripeWebhooks)

// Middleware
app.use(cors());
app.use(express.json());

// Apply date/time context middleware to all requests
app.use(contextMiddleware);

// Routes
app.get('/', (req, res) => res.send('Server is live'))
app.use('/api/user', userRouter)
app.use('/api/chat', chatRouter)
app.use('/api/message', messageRouter)
app.use('/api/credit', creditRouter)

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})