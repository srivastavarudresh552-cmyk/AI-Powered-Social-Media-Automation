import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import axios from "axios";
import { createReadStream } from "node:fs";
import { unlink } from "node:fs/promises";
import zernio from "../config/zernio.js";
import Generation from "../models/Generation.js";
import Post from "../models/Post.js";
import { Account } from "../models/Accounts.js";

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

        const interaction = await ai.interactions.create({
            model: "gemini-3.1-flash-lite",
            input: `Write a concise social media post for this idea: "${prompt.trim()}".
Tone: ${tone}. Include relevant hashtags. Return JSON with one string field, "content".`,
            response_format: {
                type: "text",
                mime_type: "application/json",
                schema: {
                    type: "object",
                    properties: { content: { type: "string" } },
                    required: ["content"],
                    additionalProperties: false,
                },
            },
            generation_config: {
                max_output_tokens: 256,
                thinking_level: ThinkingLevel.LOW.toLowerCase() as Lowercase<ThinkingLevel>,
            },
        }, { timeout: 12_000, maxRetries: 0 });

        const rawText = interaction.output_text?.trim();
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
        if (
            error?.status === 503 ||
            error?.code === "UNAVAILABLE" ||
            (error instanceof Error && /high demand|temporarily unavailable|overloaded/i.test(error.message))
        ) {
            res.status(503).json({
                message: "Gemini is temporarily overloaded. Please wait a little and try generating again.",
            });
            return;
        }
        if (
            error?.status === 504 ||
            error?.code === "DEADLINE_EXCEEDED" ||
            (error instanceof Error && /timeout|deadline exceeded|deadline expired/i.test(error.message))
        ) {
            res.status(504).json({ message: "Gemini took too long to generate this post. Please try again." });
            return;
        }
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

        if (!Array.isArray(parsedPlatform) || parsedPlatform.length === 0) {
            res.status(400).json({ message: "Select at least one platform." });
            return;
        }

        const connectedAccounts = await Account.find({
            user: req.user._id,
            platform: { $in: parsedPlatform },
            status: "connected",
            zernioAccountId: { $exists: true, $ne: "" },
        }).select("platform");
        const connectedPlatforms = new Set<string>(connectedAccounts.map((account) => account.platform));
        const unconnectedPlatforms = parsedPlatform.filter((platform: unknown): platform is string =>
            typeof platform === "string" && !connectedPlatforms.has(platform)
        );

        if (unconnectedPlatforms.length > 0) {
            res.status(400).json({
                message: `Your account${unconnectedPlatforms.length > 1 ? "s are" : " is"} not connected: ${unconnectedPlatforms.join(", ")}. Connect ${unconnectedPlatforms.length > 1 ? "them" : "it"} before scheduling.`,
            });
            return;
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