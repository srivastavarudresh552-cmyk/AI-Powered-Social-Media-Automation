import "dotenv/config";
import express, { NextFunction, Request, Response } from 'express';
import cors from "cors";
import connectDB from "./config/db.js";

const app = express();

// Database Connection 
await connectDB();

// Middleware
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

app.get('/', (_req: Request, res: Response) => {
    res.send('Server is Live!');
});

/**
 * Sends a 500 response for errors from preceding middleware, preferring a
 * nested response message over the error's own message.
 */
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err)
    res.status(500).send(err?.response?.data?.message || err?.message)
})

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
