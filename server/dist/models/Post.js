import mongoose, { Schema } from 'mongoose';
const postSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    mediaURL: {
        type: String
    },
    mediaType: {
        type: String
    },
    platforms: [{
            type: String,
            enum: ['twitter', 'linkedin', 'facebook', 'instagram', 'facebook_page', 'linkedin_page', 'instagram_business']
        }],
    scheduledFor: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'published', 'failed'],
        default: 'scheduled'
    }
}, { timestamps: true });
const Post = mongoose.model('Post', postSchema);
export default Post;
