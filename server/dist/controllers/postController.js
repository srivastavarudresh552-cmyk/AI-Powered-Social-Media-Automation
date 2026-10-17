import { GoogleGenAI } from "@google/genai";
import Generation from "../models/Generation.js";
import Post from "../models/Post.js";
// Generate post
// POST /api/posts/generate
export const generatePost = async (req, res) => {
    try {
        const { prompt, tone, generateImage } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            res.status(400).json({ message: "Gemini API Key is missing. Please add it to your server/.env file." });
            return;
        }
        const ai = new GoogleGenAI({ apiKey });
        // Generate Text
        const textResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a social media post based on this prompt: "${prompt}".
Style: ${tone}.
Include relevant hashtags.
Format the response as JSON with "content" and "imagePrompt" fields.
The "imagePrompt" should be a highly descriptive prompt for an image generator
that complements the post.`,
        });
        let content = "";
        let imagePrompt = prompt;
        try {
            const rawText = textResponse.text || "";
            const jsonMatch = rawText.match(/\{\{[\s\S]*\}\}/);
            const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { content: rawText, imagePrompt: prompt };
            content = data.content;
            imagePrompt = data.imagePrompt;
        }
        catch (e) {
            content = textResponse.text || "";
        }
        // let mediaURL = "";
        // 5:40:00 -- for image
        // if(generateImage) { // code depends on AI image generator
        //     try {
        //         // const leonardoKey = process.env.IMAGE_API;
        //         // const leoresponse = await axios.post("endpoint", {
        //         //     "public": false.
        //         //     "model": "gpt-image-2",
        //         //     "paramters" : {
        //         //         // ...
        //         //     }
        //         // })
        //     } catch (error) {
        //     }
        // }
        // Save Generation to DB
        const generation = await Generation.create({
            user: req.user._id,
            prompt,
            content,
            tone
        });
        res.json(generation);
    }
    catch (error) {
        res.status(500).json({ message: error?.message || "Server error" });
    }
    // 5:57:00
};
// Get generations
// GET /api/posts/genrations
export const getGenerations = async (req, res) => {
    try {
        const generations = await Generation.find({ user: req.user.id }).sort({ created_at: -1 });
        res.json(generations);
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Server error" });
    }
};
// Get posts
// GET /api/posts
export const getPosts = async (req, res) => {
    try {
        const posts = await Post.find({ user: req.user.id });
        res.json(posts);
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Server error" });
    }
};
// Schedule post
// POST /api/posts
export const schedulePosts = async (req, res) => {
    try {
        const { content, platforms, scheduledFor, status } = req.body;
        // Parse platforms if it comes in a stringified array from FormData
        let parsedPlatform = platforms;
        if (typeof platforms === "string") {
            try {
                parsedPlatform = JSON.parse(platforms);
            }
            catch (e) {
                parsedPlatform = platforms.split(",");
            }
        }
        // let mediaUrl: string | undefined = req.body.mediaUrl;
        // let mediaType: "image" | "video" | undefined = req.body.mediaType;
        // Upload media only if a file is provided.
        // if (req.file) {
        //     const result = await new Promise<any>((resolve, reject) => {
        //         const stream = cloudinary.uploader.upload_stream(
        //             {
        //                 resource_type: "auto",
        //                 folder: "social-scheduler",
        //             },
        //             (error, result) => {
        //                 if (error) reject(error);
        //                 else resolve(result);
        //             }
        //         );
        //         stream.end(req.file!.buffer);
        //     });
        //     mediaUrl = result.secure_url;
        //     mediaType = result.resource_type === "video" ? "video" : "image";
        // }
        const post = await Post.create({
            user: req.user._id,
            content,
            platforms: parsedPlatform,
            // ...(mediaUrl ? { mediaUrl } : {}),
            // ...(mediaType ? { mediaType } : {}),
            scheduledFor,
            status,
        });
        res.status(201).json(post);
    }
    catch (error) {
        res.status(500).json({ message: error?.message || "Server Error" });
    }
};
