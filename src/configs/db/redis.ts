import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redis = await createClient({
  url: redisUrl,
})
  .on("error", (err: unknown) => console.log("Redis Client Error", err))
  .connect();

export default redis;
