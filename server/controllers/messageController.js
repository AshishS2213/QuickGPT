import axios from "axios";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import imagekit from "../configs/imageKit.js";
import openai from "../configs/openai.js";
import { getCurrentDateContext, enhancePromptWithContext } from "../utils/contextGenerator.js";


// Text_Based AI Assistant Controller with Real-Time Context
export const textMessageController = async (req, res) => {
    try {
        const userId = req.user._id;

        // Check if user has enough credits
        if(req.user.credits < 1){
            return res.json({success: false, message: "You don't have enough credits to use this feature"});
        }

        const {chatId, prompt} = req.body;

        const chat = await Chat.findOne({userId, _id: chatId});
        const dateContext = getCurrentDateContext();
        
        // Store the original user message in chat history
        chat.messages.push({
            role:"user", 
            content: prompt, 
            timestamp: Date.now(), 
            isImage: false,
            dateContext: dateContext
        });

        // Enhance the prompt with current date/time context
        const enhancedPrompt = enhancePromptWithContext(prompt);

        // Create system message with current date awareness
        const systemMessage = `You are a helpful AI assistant. Today's date is ${dateContext.formattedDate} (${dateContext.dayOfWeek}) at ${dateContext.currentTime} ${dateContext.timezone}. 

When answering questions:
1. Be aware that today is ${dateContext.currentDate}
2. Use relative dates appropriately (e.g., "today", "tomorrow", "next week")
3. If asked about current events, news, or "now", reference ${dateContext.currentDate}
4. When discussing events or data, compare dates relative to today: ${dateContext.currentDate}
5. If discussing future dates, calculate from today's date ${dateContext.currentDate}`;

        const {choices} = await openai.chat.completions.create({
            model: "gemini-3-flash-preview",
            messages: [
                {
                    role: "user",
                    content: systemMessage,
                },
                {
                    role: "user",
                    content: enhancedPrompt,
                },
            ],
        });

        const reply = {
            ...choices[0].message, 
            timestamp: Date.now(), 
            isImage: false,
            dateContext: dateContext
        };
        res.json({success: true, reply});
        
        chat.messages.push(reply);
        await chat.save();
        await User.updateOne({_id: userId}, {$inc: {credits: -1}});

    } catch (error) {
        res.json({success: false, message: error.message});
    }
}

// Image Generation AI Assistant Controller
export const imageMessageController = async (req, res) => {
    try {
        const userId = req.user._id;
        // Check if user has enough credits
        if(req.user.credits < 2){
            return res.json({success: false, message: "You don't have enough credits to generate an image"});
        }
        const {prompt, chatId, isPublished} = req.body;
        // Find the chat
        const chat = await Chat.findOne({userId, _id: chatId});

        // Add user message to chat
        chat.messages.push({
            role:"user",
            content: prompt,
            timestamp: Date.now(),
            isImage: false})
        
        // Encode prompt
        const encodedPrompt = encodeURIComponent(prompt);

        // Construct the image generation URL
        const generatedImageUrl = `${process.env.IMAGEKIT_URL_ENDPOINT}/ik-genimg-prompt-${encodedPrompt}/quickgpt/${Date.now()}.png?tr=w-800,h-800`;

        // Trigger image generation
        const aiImageResponse = await axios.get(generatedImageUrl, {responseType: 'arraybuffer'});

        // Convert image to base64
        const base64Image = `data:image/png;base64,${Buffer.from(aiImageResponse.data, "binary").toString('base64')}`;

        // Upload image to ImageKit
        const uploadResponse = await imagekit.upload({
            file : base64Image,
            fileName : `${Date.now()}.png`,
            folder : "quickgpt"
        })

        const reply = {
                role: 'assistant',
                content: uploadResponse.url,
                timestamp: Date.now(),
                isImage: true,
                isPublished
        };

        res.json({success: true, reply});

        chat.messages.push(reply);
        await chat.save();

        await User.updateOne({_id: userId}, {$inc: {credits: -2}});

    } catch (error) {
        res.json({success: false, message: error.message});
    }
}