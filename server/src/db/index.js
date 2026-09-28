import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅  MongoDB connected: ${conn.connection.host}`);

    // Clean up any legacy unique index on username from earlier database iterations
    try {
      await conn.connection.db.collection("users").dropIndex("username_1");
    } catch {
      // Index already dropped or doesn't exist
    }
  } catch (error) {
    console.error("❌  MongoDB connection error:", error.message);
    throw error;
  }
};

export default connectDB;

