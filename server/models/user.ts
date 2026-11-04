import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email : {type: String, required: true, unique: true},
    password: {type: String, select: false},
    name: {type: String, required: true},
    zernioProfileId: {type: String},
    googleId: {type: String, unique: true, sparse: true},
    githubId: {type: String, unique: true, sparse: true}
}, {timestamps: true});

export const User = mongoose.model('User', userSchema)