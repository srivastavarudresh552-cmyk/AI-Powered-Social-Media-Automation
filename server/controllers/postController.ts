import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { createReadStream } from "node:fs";
import { unlink } from "node:fs/promises";
import zernio from "../config/zernio.js";
import Generation from "../models/Generation.js";
import Post from "../models/Post.js";

const supportedMediaTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/avi",
    "video/x-msvideo",
    "video/webm",
    "video/x-m4v",
] as const;



// Generate post
// POST /api/posts/generate
export const generatePost = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { prompt, tone } = req.body;
        if (typeof prompt !== "string" || !prompt.trim()) {
            res.status(400).json({ message: "Please provide a prompt to generate a post." });
            return;
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            res.status(400).json({ message: "Gemini API Key is missing. Please add it to your server/.env file." })
            return;
        }

        const ai = new GoogleGenAI({ apiKey });

        // Generate Text
        const textResponse = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            config: { responseMimeType: "application/json" },
            contents: `Generate a social media post based on this prompt: "${prompt.trim()}".
Style: ${tone}.
Include relevant hashtags.
Return a JSON object with a single "content" field containing the complete post.`,
        });

        const rawText = textResponse.text?.trim();
        if (!rawText) {
            throw new Error("Gemini returned an empty response.");
        }

        const jsonText = rawText
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();
        const result = JSON.parse(jsonText) as { content?: unknown };
        if (typeof result.content !== "string" || !result.content.trim()) {
            throw new Error("Gemini returned a response without post content.");
        }
        const content = result.content.trim();

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
        })

        res.json(generation);

    } catch (error: any) {
        res.status(500).json({ message: error?.message || "Server error" });
    }

    // 5:57:00
}

// Get generations
// GET /api/posts/genrations
export const getGenerations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const generations = await Generation.find({ user: req.user.id }).sort({ created_at: -1 });
        res.json(generations);
    } catch (error: any) {
        res.status(500).json({ message: error.message || "Server error" });
    }
};

// Get posts
// GET /api/posts
export const getPosts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const posts = await Post.find({ user: req.user.id });
        res.json(posts);
    } catch (error: any) {
        res.status(500).json({ message: error.message || "Server error" });
    }
};


// Schedule post
// POST /api/posts
export const schedulePosts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { content, platforms, scheduledFor, status } = req.body;

        // Parse platforms if it comes in a stringified array from FormData

        let parsedPlatform = platforms;
        if (typeof platforms === "string") {
            try {
                parsedPlatform = JSON.parse(platforms)
            } catch (e) {
                parsedPlatform = platforms.split(",")
            }
        }


        let mediaURL: string | undefined;
        let mediaType: "image" | "video" | undefined;

        if (req.file) {
            const contentType = supportedMediaTypes.find((type) => type === req.file!.mimetype);
            if (!contentType) {
                res.status(400).json({ message: "Unsupported image or video format" });
                return;
            }

            const { data: upload } = await zernio.media.getMediaPresignedUrl({
                body: {
                    filename: req.file.originalname,
                    contentType,
                    size: req.file.size,
                },
            });
            if (!upload.uploadUrl || !upload.publicUrl) {
                throw new Error("Zernio did not return media upload URLs");
            }

            await axios.put(upload.uploadUrl, createReadStream(req.file.path), {
                headers: {
                    "Content-Type": contentType,
                    "Content-Length": req.file.size,
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            });

            mediaURL = upload.publicUrl;
            mediaType = contentType.startsWith("video/") ? "video" : "image";
        }

        const post = await Post.create({
            user: req.user._id,
            content,
            platforms: parsedPlatform,
            ...(mediaURL ? { mediaURL, mediaType } : {}),
            scheduledFor,
            status,
        })

        res.status(201).json(post)

    } catch (error: any) {
        res.status(500).json({ message: error?.message || "Server Error" });
    } finally {
        if (req.file) {
            try {
                await unlink(req.file.path);
            } catch (error) {
                console.error("Failed to remove temporary media upload", error);
            }
        }
    }
}