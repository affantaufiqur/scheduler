import { createServerFn } from "@tanstack/react-start";

export const getCurrentUser = createServerFn({ method: "GET" })
  .handler(async () => {
    // This will be wrapped by auth middleware in routes
    // The middleware will provide the user context
    return { message: "This should be wrapped by auth middleware" };
  });
