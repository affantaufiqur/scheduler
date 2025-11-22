type SettingsSection = "general" | "working-hours" | "blackout-dates";

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  setActiveSection: (section: SettingsSection) => void;
}

export function SettingsSidebar({ activeSection, setActiveSection }: SettingsSidebarProps) {
  const menuItems = [
    { id: "general", label: "General Settings" },
    { id: "working-hours", label: "Working Hours" },
    { id: "blackout-dates", label: "Blackout Dates" },
  ] as const;

  return (
    <div className="py-4 pr-1">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Settings</h2>
      <nav className="space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
              activeSection === item.id
                ? "bg-blue-100 text-blue-700"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
