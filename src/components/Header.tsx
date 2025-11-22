import { Link } from "@tanstack/react-router";

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
          </div>
        </div>
      </nav>
    </header>
  );
}
