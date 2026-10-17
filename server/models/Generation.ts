import mongoose, { Schema } from 'mongoose';

const generationSchema = new Schema({
user: {
type: mongoose.Schema.Types.ObjectId,
ref: 'User',
required: true
},
prompt: {
type: String,
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
type: String,
enum: ['image', 'video']
},
tone: {
type: String
}
}, { timestamps: true });

const Generation = mongoose.model('Generation', generationSchema);

export default Generation;