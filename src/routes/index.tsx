import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const server = createServerFn().handler(() => {
  throw redirect({
    to: "/app",
  });
});

export const Route = createFileRoute("/")({ component: App, beforeLoad: () => server() });

function App() {
  return <></>;
}
