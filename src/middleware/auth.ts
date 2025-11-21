import { createMiddleware } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { getMe } from "@/service/user";

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const token = getCookie("token");
  if (!token) {
    throw redirect({
      to: "/login",
    });
  }

  const user = await getMe(token);
  if (!user) {
    throw redirect({
      to: "/login",
    });
  }

  return next({
    context: {
      user: user[0],
    },
  });
});
