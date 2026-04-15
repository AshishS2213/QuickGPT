import axios from "axios";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import imagekit from "../configs/imageKit.js";
import openai from "../configs/openai.js";
import { getCurrentDateContext } from "../utils/contextGenerator.js";
import { createOptimizedGeminiMessage } from "../utils/geminiContextFormatter.js";
import { fetchRealtimeDataIfNeeded } from "../utils/smartRealtimeDataFetcher.js";
import { isCurrentDataQuery } from "../utils/realtimeDataFetcher.js";


// Text_Based AI Assistant Controller with Real-Time Context
// This controller NOW prioritizes current date context over model training data
export const textMessageController = async (req, res) => {
    try {
        const userId = req.user._id;

        // Check if user has enough credits
        // if(req.user.credits < 1){
        //     return res.json({success: false, message: "You don't have enough credits to use this feature"});
        // }

        const {chatId, prompt} = req.body;

        const chat = await Chat.findOne({userId, _id: chatId});
        const dateContext = getCurrentDateContext();

        // Log for debugging
        console.log(`[${dateContext.currentDate}] User prompt: "${prompt}"`);

        // Fetch real-time data if query requires it
        let realtimeData = null;
        if (isCurrentDataQuery(prompt)) {
            console.log('[Real-Time Data] Attempting to fetch live data...');
            realtimeData = await fetchRealtimeDataIfNeeded(prompt);
        }
        
        // Store the original user message in chat history
        chat.messages.push({
            role:"user", 
            content: prompt, 
            timestamp: Date.now(), 
            isImage: false,
            dateContext: dateContext
        });

        // Create optimized message with context that Gemini WILL recognize
        // This uses a single message with prepended context (more effective than system role)
        const optimizedMessage = createOptimizedGeminiMessage(prompt, realtimeData);

        // Call Gemini with the optimized context-aware message
        const {choices} = await openai.chat.completions.create({
            model: "gemini-3-flash-preview",
            messages: [optimizedMessage],
            temperature: 0.7,
            top_p: 1,
        });

        const reply = {
            ...choices[0].message, 
            timestamp: Date.now(), 
            isImage: false,
            dateContext: dateContext
        };
        
        console.log(`[${dateContext.currentDate}] AI Response preview: "${reply.content.substring(0, 100)}..."`);
        res.json({success: true, reply});
        
        chat.messages.push(reply);
        await chat.save();
        // await User.updateOne({_id: userId}, {$inc: {credits: -1}});

    } catch (error) {
        console.error(`Error in textMessageController: ${error.message}`);
        res.json({success: false, message: error.message});
    }
}

// Image Generation AI Assistant Controller
export const imageMessageController = async (req, res) => {
    try {
        const userId = req.user._id;
        // Check if user has enough credits
        // if(req.user.credits < 2){
        //     return res.json({success: false, message: "You don't have enough credits to generate an image"});
        // }
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

        // await User.updateOne({_id: userId}, {$inc: {credits: -2}});

    } catch (error) {
        res.json({success: false, message: error.message});
    }
}