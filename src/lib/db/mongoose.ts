import mongoose, { type Mongoose } from "mongoose";
import { getServerEnv } from "../env";

declare global {
  var mongooseCache:
    | {
        connection: Mongoose | null;
        promise: Promise<Mongoose> | null;
      }
    | undefined;
}

const cache = (globalThis.mongooseCache ??= {
  connection: null,
  promise: null,
});

export async function connectDB(): Promise<Mongoose> {
  if (cache.connection?.connection.readyState === 1) {
    return cache.connection;
  }

  if (cache.connection) {
    cache.connection = null;
    cache.promise = null;
  }

  if (!cache.promise) {
    const { MONGODB_URI } = getServerEnv();
    cache.promise = mongoose.connect(MONGODB_URI).catch((cause: unknown) => {
      throw new Error(
        "MongoDB connection failed. Check that MONGODB_URI is valid and the database is reachable.",
        { cause },
      );
    });
  }

  try {
    cache.connection = await cache.promise;
    return cache.connection;
  } catch (error) {
    cache.connection = null;
    cache.promise = null;
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (cache.connection) {
    await mongoose.disconnect();
    cache.connection = null;
    cache.promise = null;
  }
}