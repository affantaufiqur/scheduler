import { Link, redirect } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { LogOut } from "lucide-react";
import { deleteCookie } from "@tanstack/react-start/server";

const logout = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie("token", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  throw redirect({
    to: "/login",
  });
});

interface HeaderProps {
  username: string;
}

const routes = [
  {
    id: "home",
    href: "/app",
    name: "Home",
  },
  {
    id: "settings",
    href: "/app/settings",
    name: "Settings",
  },
];

export default function Header({ username }: HeaderProps) {
  const logoutFn = useServerFn(logout);
  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            {routes.map((route) => (
              <Link
                viewTransition={true}
                key={route.id}
                to={route.href}
                className={`rounded-md py-2 text-sm font-medium`}
              >
                {route.name}
              </Link>
            ))}
          </div>
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700">{username}</span>
            <button onClick={() => logoutFn()}>
              <LogOut className="ml-4 h-5 w-5 cursor-pointer text-gray-500 hover:text-gray-700" />
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
