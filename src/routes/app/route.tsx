import { createFileRoute, Outlet } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/middleware/auth";
import Header from "@/components/Header";

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
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <Header username={user.username} />
      <Outlet />
    </div>
  );
}
