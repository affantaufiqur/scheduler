import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateOrganizerSettings } from "@/functions/organizer-settings";
import { getTimeZoneValues } from "@/helpers/list-timezone";
import { useState } from "react";
import { OrganizerSettingsData } from "@/functions/organizer-settings";

interface GeneralSettingsProps {
  settings: OrganizerSettingsData;
}

export function GeneralSettings({ settings }: GeneralSettingsProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState<OrganizerSettingsData>({
    defaultMeetingDuration: settings?.defaultMeetingDuration || 30,
    preBookingBuffer: settings?.preBookingBuffer || 0,
    postBookingBuffer: settings?.postBookingBuffer || 0,
    minBookingNotice: settings?.minBookingNotice || 2,
    maxBookingAdvance: settings?.maxBookingAdvance || 14,
    workingTimezone: settings?.workingTimezone || "UTC",
  });

  const updateMutation = useMutation({
    mutationFn: (data: OrganizerSettingsData) => updateOrganizerSettings({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizer-settings"] });
      setSuccessMessage("Settings updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error) => {
      console.error("Failed to update settings:", error);
      // Handle error display
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleInputChange = (field: keyof OrganizerSettingsData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === "workingTimezone" ? value : Number(value),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    updateMutation.mutate(formData);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">General Settings</h1>

      {successMessage && (
        <div className="mb-4 rounded-md bg-green-100 p-3 text-green-700">{successMessage}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="defaultMeetingDuration"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Default Meeting Duration (minutes)
          </label>
          <input
            type="number"
            id="defaultMeetingDuration"
            min="15"
            max="240"
            value={formData.defaultMeetingDuration}
            onChange={(e) => handleInputChange("defaultMeetingDuration", e.target.value)}
            className="block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">Duration for new meetings (15-240 minutes)</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="preBookingBuffer"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Pre-booking Buffer (minutes)
            </label>
            <input
              type="number"
              id="preBookingBuffer"
              min="0"
              max="120"
              value={formData.preBookingBuffer}
              onChange={(e) => handleInputChange("preBookingBuffer", e.target.value)}
              className="block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">Time to block before meetings</p>
          </div>

          <div>
            <label
              htmlFor="postBookingBuffer"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Post-booking Buffer (minutes)
            </label>
            <input
              type="number"
              id="postBookingBuffer"
              min="0"
              max="120"
              value={formData.postBookingBuffer}
              onChange={(e) => handleInputChange("postBookingBuffer", e.target.value)}
              className="block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">Time to block after meetings</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="minBookingNotice"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Minimum Booking Notice (hours)
            </label>
            <input
              type="number"
              id="minBookingNotice"
              min="0"
              max="168"
              value={formData.minBookingNotice}
              onChange={(e) => handleInputChange("minBookingNotice", e.target.value)}
              className="block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              How far in advance users must book (0-168 hours)
            </p>
          </div>

          <div>
            <label
              htmlFor="maxBookingAdvance"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Maximum Booking Advance (days)
            </label>
            <input
              type="number"
              id="maxBookingAdvance"
              min="1"
              max="365"
              value={formData.maxBookingAdvance}
              onChange={(e) => handleInputChange("maxBookingAdvance", e.target.value)}
              className="block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              How far in the future users can book (1-365 days)
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="workingTimezone" className="mb-1 block text-sm font-medium text-gray-700">
            Working Timezone
          </label>
          <select
            id="workingTimezone"
            value={formData.workingTimezone}
            onChange={(e) => handleInputChange("workingTimezone", e.target.value)}
            className="block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            {getTimeZoneValues().map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">Your working timezone for scheduling</p>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
