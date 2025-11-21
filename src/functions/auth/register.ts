import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { createUser } from "@/service/user";

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const register = createServerFn({ method: "POST" })
  .inputValidator(registerSchema)
  .handler(async ({ data }) => {
    const register = await createUser(data);
    if (register.error) {
      return false;
    }

    const token = register.token;

    setCookie("token", token!, {
      path: "/",
      secure: false,
    });

    return true;
  });
