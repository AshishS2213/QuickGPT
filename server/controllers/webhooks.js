import Stripe from "stripe";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

export const stripeWebhooks = async (request, response) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sig = request.headers["stripe-signature"];

    console.log("📍 Webhook endpoint hit");
    console.log("Signature present:", !!sig);

    let event;

    try {
        // Handle both raw string and buffer bodies
        let body = request.body;
        if (typeof body === 'string') {
            body = Buffer.from(body);
        }
        
        event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        console.log("✅ Webhook signature verified");
    } catch (error) {
        console.error("❌ Webhook signature verification failed:", error.message);
        return response.status(400).send(`Webhook Error: ${error.message}`);
    }

    console.log("📨 Webhook Event Type:", event.type);

    try {
        switch (event.type) {
            // Handle checkout.session.completed (primary payment confirmation)
            case "checkout.session.completed": {
                const session = event.data.object;
                console.log("💳 Checkout Session Completed:", session.id);
                console.log("Session Metadata:", session.metadata);
                console.log("Payment Status:", session.payment_status);
                
                const {transactionId, appId} = session.metadata || {};
                
                if(!transactionId) {
                    console.error("❌ No transactionId in metadata");
                    return response.status(400).json({received: false, message: "Missing transactionId"});
                }

                if(appId === 'quickgpt'){
                    const transaction = await Transaction.findOne({_id: transactionId});
                    
                    if(!transaction) {
                        console.error("❌ Transaction not found:", transactionId);
                        return response.status(400).json({received: false, message: "Transaction not found"});
                    }

                    if(transaction.isPaid) {
                        console.log("⚠️  Transaction already paid:", transactionId);
                        return response.json({received: true, message: "Already processed"});
                    }

                    // Update credit balance
                    const userUpdate = await User.updateOne({_id: transaction.userId}, {$inc: {credits: transaction.credits}});
                    console.log("👤 User Updated:", userUpdate.modifiedCount === 1 ? "✅" : "❌");

                    // Update credits payment status
                    transaction.isPaid = true;
                    await transaction.save();
                    
                    console.log("✅ Payment confirmed for transaction:", transactionId, "Credits added:", transaction.credits);
                }else{
                    console.error("❌ Invalid appId:", appId);
                    return response.json({received: true, message: "App not found"});
                }
                break;
            }

            // Fallback: Handle payment_intent.succeeded
            case "payment_intent.succeeded": {
                const payment_intent = event.data.object;
                console.log("⚠️  Using payment_intent.succeeded - this is unusual");
                console.log("Payment Intent ID:", payment_intent.id);
                
                const sessionList = await stripe.checkout.sessions.list({
                    payment_intent: payment_intent.id,
                    limit: 1
                });

                if(!sessionList.data.length) {
                    console.error("❌ No session found for payment intent:", payment_intent.id);
                    return response.status(400).json({received: false, message: "Session not found"});
                }

                const session = sessionList.data[0];
                const {transactionId, appId} = session.metadata || {};
                
                console.log("Transaction ID:", transactionId, "App ID:", appId);

                if(appId === 'quickgpt'){
                    const transaction = await Transaction.findOne({_id: transactionId});
                    
                    if(!transaction) {
                        console.error("❌ Transaction not found or already paid:", transactionId);
                        return response.status(400).json({received: false, message: "Transaction not found"});
                    }

                    if(transaction.isPaid) {
                        console.log("⚠️  Transaction already paid");
                        return response.json({received: true});
                    }

                    // Update credit balance
                    await User.updateOne({_id: transaction.userId}, {$inc: {credits: transaction.credits}});

                    // Update credits payment status
                    transaction.isPaid = true;
                    await transaction.save();
                    
                    console.log("✅ Payment confirmed via payment_intent for transaction:", transactionId);
                }else{
                    console.error("❌ Invalid appId:", appId);
                }
                break;
            }
                        
            default:
                console.log("⚠️  Unhandled event type:", event.type);
                console.log("Available event types to handle: checkout.session.completed, payment_intent.succeeded");
                break;
        }
        response.json({received: true});
    } catch (error) {
        console.error("❌ Webhook processing error:", error);
        console.error("Stack:", error.stack);
        response.status(500).json({received: false, error: error.message});
    }
}