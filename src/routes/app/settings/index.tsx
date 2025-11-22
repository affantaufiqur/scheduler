import { createFileRoute } from "@tanstack/react-router";
import { getOrganizerSettings } from "@/functions/organizer-settings";
import { useState } from "react";
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { WorkingHours } from "@/components/settings/WorkingHours";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/app/settings/")({
  component: RouteComponent,
});

type SettingsSection = "general" | "working-hours";

function RouteComponent() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["organizer-settings"],
    queryFn: () => getOrganizerSettings(),
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-lg">Loading settings...</div>
      </div>
    );
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case "general":
        return <GeneralSettings settings={settings} />;
      case "working-hours":
        return <WorkingHours />;
      default:
        return <GeneralSettings settings={settings} />;
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-gray-200 bg-white">
        <SettingsSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      </div>
      <div className="flex-1 p-6">{renderActiveSection()}</div>
    </div>
  );
}
