type SettingsSection = "general" | "working-hours";

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  setActiveSection: (section: SettingsSection) => void;
}

export function SettingsSidebar({
  activeSection,
  setActiveSection,
}: SettingsSidebarProps) {
  const menuItems = [
    { id: "general", label: "General Settings" },
    { id: "working-hours", label: "Working Hours" },
  ] as const;

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
      <nav className="space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
