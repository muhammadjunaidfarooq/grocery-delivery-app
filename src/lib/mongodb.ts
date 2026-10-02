import mongoose from "mongoose";

// Reuse one connection across hot reloads (dev) and requests (serverless)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDb = async () => {
  if (cached.conn) {
    return cached.conn;
  }
  // Checked here (not at import time) so `next build` works without a database
  const mongodbUrl = process.env.MONGODB_URL;
  if (!mongodbUrl) {
    throw new Error(
      "MONGODB_URL is not set. Add it to .env.local (local) or the Vercel project settings (production).",
    );
  }
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(mongodbUrl, { serverSelectionTimeoutMS: 10000 })
      .then((conn) => conn.connection);
  }
  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    // Forget the failed attempt so the next request tries again,
    // and let the route return a proper error instead of hanging.
    cached.promise = null;
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

export default connectDb;
