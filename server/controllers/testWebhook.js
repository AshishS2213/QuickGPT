import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

// Test endpoint to manually trigger the payment confirmation logic
// Usage: POST http://localhost:3000/api/test-webhook?transactionId=YOUR_ID
export const testWebhookManually = async (req, res) => {
    try {
        const {transactionId} = req.query;
        
        if (!transactionId) {
            return res.json({
                success: false,
                message: "Please provide transactionId in query params: ?transactionId=YOUR_ID"
            });
        }

        console.log("\n🧪 === MANUAL WEBHOOK TEST ===");
        console.log("Testing transaction:", transactionId);

        // Find the transaction
        const transaction = await Transaction.findById(transactionId);
        
        if (!transaction) {
            return res.json({
                success: false,
                message: "Transaction not found",
                transactionId
            });
        }

        console.log("✅ Transaction found:");
        console.log("   - User ID:", transaction.userId);
        console.log("   - Credits:", transaction.credits);
        console.log("   - isPaid:", transaction.isPaid);
        console.log("   - Amount:", transaction.amount);

        // Check if user exists
        const user = await User.findById(transaction.userId);
        if (!user) {
            return res.json({
                success: false,
                message: "User not found",
                userId: transaction.userId
            });
        }

        console.log("✅ User found:");
        console.log("   - Name:", user.name);
        console.log("   - Credits before:", user.credits);

        if (transaction.isPaid) {
            console.log("⚠️  Transaction already paid");
            return res.json({
                success: false,
                message: "Transaction already marked as paid"
            });
        }

        // Update user credits
        const userUpdate = await User.updateOne(
            {_id: transaction.userId},
            {$inc: {credits: transaction.credits}}
        );

        console.log("👤 User update result:", userUpdate.modifiedCount === 1 ? "✅ Success" : "❌ Failed");

        // Mark transaction as paid
        transaction.isPaid = true;
        await transaction.save();

        console.log("💰 Transaction updated to isPaid: true");

        // Fetch updated user to verify
        const updatedUser = await User.findById(transaction.userId);
        console.log("📊 User credits after:", updatedUser.credits);
        console.log("✅ === TEST COMPLETED SUCCESSFULLY ===\n");

        return res.json({
            success: true,
            message: "Webhook logic executed successfully",
            details: {
                transactionId,
                creditsAdded: transaction.credits,
                userCreditsAfter: updatedUser.credits,
                isPaidNow: true
            }
        });

    } catch (error) {
        console.error("❌ Test webhook error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
            stack: error.stack
        });
    }
};
