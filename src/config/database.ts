import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env.MONGODB_URI || "";
        console.log(`🔗 Connecting to MongoDB... (URI ${mongoURI ? 'is set, length=' + mongoURI.length : 'IS EMPTY — check .env'})`);
        await mongoose.connect(mongoURI!);
        
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1);
    }
};

export default connectDB;