import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import db from "./configs/db";
import redis from "./configs/db/redis";

declare module "@tanstack/react-start" {
  interface Register {
    server: {
      requestContext: {
        db: typeof db;
        redis: typeof redis;
      };
    };
  }
}

export default createServerEntry({
  fetch(request) {
    return handler.fetch(request, { context: { db, redis } });
  },
});
