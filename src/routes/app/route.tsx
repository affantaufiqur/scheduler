import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/middleware/auth";

const server = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return context.user;
  });

export const Route = createFileRoute("/app")({
  component: RouteComponent,
  beforeLoad: async () => {
    const user = await server();
    return { user };
  },
});

function RouteComponent() {
  const { user } = Route.useRouteContext();
  return <div>Hello {user.username}</div>;
}
