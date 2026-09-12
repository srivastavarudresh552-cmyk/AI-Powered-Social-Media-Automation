import mongoose from "mongoose";

/**
 * Connects Mongoose using `MONGODB_URI`.
 *
 * Terminates the process with exit code 1 if the connection cannot be
 * established.
 */
const connectDB = async () => {
    try {
        mongoose.connection.on("connected", async () => {
            console.log('MongoDB connected')
        });
        await mongoose.connect(process.env.MONGODB_URI!)
    } catch (error : any) {
        console.error(error)
        process.exit(1);
    }
}

export default connectDB;
