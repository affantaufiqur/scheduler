import { createClient } from "redis";

const redis = await createClient({
  url: process.env.REDIS_URL,
})
  .on("error", (err: unknown) => console.log("Redis Client Error", err))
  .connect();

export default redis;
