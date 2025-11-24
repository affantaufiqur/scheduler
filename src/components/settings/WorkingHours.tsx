import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWorkingHours,
  bulkUpdateWorkingHoursFn,
  deleteWorkingHoursFn,
} from "@/functions/organizer-settings";
import { getOrganizerSettings } from "@/functions/organizer-settings";
import { toast } from "sonner";

interface WorkingHoursBackend {
  id: string;
  userId: string;
  dayOfWeek: string;
  startTime: string; // Time format from DB (HH:mm)
  endTime: string; // Time format from DB (HH:mm)
  startTimeUtc: Date; // UTC timestamp
  endTimeUtc: Date; // UTC timestamp
  startTimeLocal: string; // Local time for display (HH:mm)
  endTimeLocal: string; // Local time for display (HH:mm)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const DAY_TO_NUMBER: Record<string, string> = {
  Sunday: "0",
  Monday: "1",
  Tuesday: "2",
  Wednesday: "3",
  Thursday: "4",
  Friday: "5",
  Saturday: "6",
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function WorkingHours() {
  const queryClient = useQueryClient();

  // Fetch working hours
  const {
    data: workingHours,
    isLoading,
    error,
  } = useQuery<WorkingHoursBackend[]>({
    queryKey: ["working-hours"],
    queryFn: () => getWorkingHours(),
  });

  // Fetch organizer settings to get timezone
  const { data: organizerSettings } = useQuery({
    queryKey: ["organizer-settings"],
    queryFn: () => getOrganizerSettings(),
  });

  // Track edits directly - this is what we'll submit
  const [editedHours, setEditedHours] = useState<WorkingHoursBackend[]>([]);
  const [validationError, setValidationError] = useState<string>("");
  const [deleteError, setDeleteError] = useState<string>("");

  // Derive display data: use edited if available, otherwise use fetched data
  const displayData = editedHours.length > 0 ? editedHours : (workingHours ?? []);

  // Group by day for display
  const getSlotsByDay = (dayNumber: string): WorkingHoursBackend[] => {
    return displayData
      .filter((wh) => wh.dayOfWeek === dayNumber && wh.isActive)
      .sort((a, b) => a.startTimeLocal.localeCompare(b.startTimeLocal));
  };

  // Check if day is enabled
  const isDayEnabled = (dayNumber: string): boolean => {
    const slots = getSlotsByDay(dayNumber);
    return slots.length > 0 && slots.some((wh) => wh.isActive);
  };

  // Initialize edits from current data if not already editing
  const ensureEditsInitialized = (): void => {
    if (editedHours.length === 0 && workingHours) {
      setEditedHours([...workingHours]);
    }
  };

  // Toggle day enabled/disabled
  const toggleDayEnabled = (dayNumber: string): void => {
    ensureEditsInitialized();

    setEditedHours((prev) => {
      const daySlots = prev.filter((wh) => wh.dayOfWeek === dayNumber);
      const isCurrentlyEnabled = daySlots.some((wh) => wh.isActive);

      if (isCurrentlyEnabled) {
        // Disable: set isActive to false for all slots on this day
        return prev.map((wh) => (wh.dayOfWeek === dayNumber ? { ...wh, isActive: false } : wh));
      } else {
        // Enable: set isActive to true for all slots on this day, or add default
        const existingSlots = prev.filter((wh) => wh.dayOfWeek === dayNumber);
        if (existingSlots.length > 0) {
          return prev.map((wh) => (wh.dayOfWeek === dayNumber ? { ...wh, isActive: true } : wh));
        } else {
          return [
            ...prev,
            {
              id: `new-${Date.now()}`,
              userId: "",
              dayOfWeek: dayNumber,
              startTime: "",
              endTime: "",
              startTimeUtc: new Date(), // Placeholder
              endTimeUtc: new Date(), // Placeholder
              startTimeLocal: "09:00", // Default to 9 AM
              endTimeLocal: "17:00", // Default to 5 PM
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
            },
          ];
        }
      }
    });
  };

  // Add time slot to day
  const addTimeSlot = (dayNumber: string): void => {
    ensureEditsInitialized();

    setEditedHours((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        userId: "",
        dayOfWeek: dayNumber,
        startTime: "",
        endTime: "",
        startTimeUtc: new Date(),
        endTimeUtc: new Date(),
        startTimeLocal: "09:00", // Default to 9 AM
        endTimeLocal: "17:00", // Default to 5 PM
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);
  };

  // Remove time slot - delete from DB if it's a real record, local remove if new
  const removeTimeSlot = (id: string): void => {
    // If it's a newly created slot (starts with "new-"), just remove locally
    if (id.startsWith("new-")) {
      setEditedHours((prev) => prev.filter((wh) => wh.id !== id));
      return;
    }

    // Otherwise, delete from database
    deleteWorkingHoursMutation.mutate(id);
  };

  // Mutation for deleting individual slots
  const deleteWorkingHoursMutation = useMutation({
    mutationFn: (slotId: string) => deleteWorkingHoursFn({ data: { id: slotId } }),
    onMutate: async (slotId) => {
      await queryClient.cancelQueries({ queryKey: ["working-hours"] });
      const previousData = queryClient.getQueryData<WorkingHoursBackend[]>(["working-hours"]);

      // Optimistically remove from UI
      queryClient.setQueryData(
        ["working-hours"],
        (prev: WorkingHoursBackend[] | undefined) => prev?.filter((wh) => wh.id !== slotId) ?? [],
      );

      toast.success("Time slot removed");
      return { previousData };
    },
    onError: (_err, _variables, context) => {
      setDeleteError("Failed to delete time slot. Please try again.");
      if (context?.previousData) {
        queryClient.setQueryData(["working-hours"], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["working-hours"] });
    },
  });

  // Update time for a slot
  const updateSlotTime = (
    id: string,
    field: "startTimeLocal" | "endTimeLocal",
    value: string,
  ): void => {
    ensureEditsInitialized();
    setEditedHours((prev) => prev.map((wh) => (wh.id === id ? { ...wh, [field]: value } : wh)));
  };

  // Format time to HH:mm
  const formatTimeHHmm = (time: string): string => {
    if (!time) return "00:00";
    if (/^\d{2}:\d{2}$/.test(time)) return time;
    const [hours, minutes] = time.split(":").map(Number);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  // Check if two time slots overlap
  const slotsOverlap = (slot1: WorkingHoursBackend, slot2: WorkingHoursBackend): boolean => {
    const start1 = slot1.startTimeLocal.split(":").map(Number);
    const end1 = slot1.endTimeLocal.split(":").map(Number);
    const start2 = slot2.startTimeLocal.split(":").map(Number);
    const end2 = slot2.endTimeLocal.split(":").map(Number);

    const start1Minutes = start1[0] * 60 + start1[1];
    const end1Minutes = end1[0] * 60 + end1[1];
    const start2Minutes = start2[0] * 60 + start2[1];
    const end2Minutes = end2[0] * 60 + end2[1];

    return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
  };

  // Validate no overlapping slots for each day
  const validateNoOverlaps = (): { valid: boolean; errorDay?: string } => {
    for (const dayNum of Object.keys(DAY_TO_NUMBER)) {
      const dayNumber = DAY_TO_NUMBER[dayNum];
      const slots = displayData.filter((wh) => wh.dayOfWeek === dayNumber && wh.isActive);

      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          if (slotsOverlap(slots[i], slots[j])) {
            return { valid: false, errorDay: dayNum };
          }
        }
      }
    }
    return { valid: true };
  };

  // Prepare data for backend submission
  const prepareSubmissionData = (): Array<{
    id?: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }> => {
    return editedHours.map((wh) => ({
      ...(wh.id.startsWith("new-") ? {} : { id: wh.id }),
      dayOfWeek: wh.dayOfWeek,
      startTime: formatTimeHHmm(wh.startTimeLocal), // Use local time for submission
      endTime: formatTimeHHmm(wh.endTimeLocal), // Use local time for submission
      isActive: wh.isActive,
    }));
  };

  // Mutation for saving
  const saveWorkingHoursMutation = useMutation({
    mutationFn: (
      data: Array<{
        id?: string;
        dayOfWeek: string;
        startTime: string;
        endTime: string;
        isActive: boolean;
      }>,
    ) => bulkUpdateWorkingHoursFn({ data }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["working-hours"] });
      const previousData = queryClient.getQueryData<WorkingHoursBackend[]>(["working-hours"]);
      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["working-hours"], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["working-hours"] });
      setEditedHours([]);
    },
  });

  const handleSave = (): void => {
    // Validate no overlapping slots
    const validation = validateNoOverlaps();
    if (!validation.valid) {
      setValidationError(
        `Overlapping time slots detected on ${validation.errorDay}. Please adjust your schedule.`,
      );
      return;
    }

    setValidationError("");
    const submitData = prepareSubmissionData();
    saveWorkingHoursMutation.mutate(submitData);
  };

  const isSaving = saveWorkingHoursMutation.isPending;
  const saveError = saveWorkingHoursMutation.error;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Working Hours</h1>
        <p className="mt-1 text-gray-600">
          Set your weekly availability schedule. All times shown in{" "}
          {organizerSettings?.workingTimezone || "UTC"}.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> Failed to load working hours. Please refresh the page.
          </p>
        </div>
      )}

      {validationError && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            <strong>Validation Error:</strong> {validationError}
          </p>
        </div>
      )}

      {deleteError && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {deleteError}
          </p>
        </div>
      )}

      {saveError && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> Failed to save working hours:{" "}
            {saveError instanceof Error ? saveError.message : "Unknown error"}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {WEEKDAYS.map((dayName) => {
          const dayNumber = DAY_TO_NUMBER[dayName];
          const isEnabled = isDayEnabled(dayNumber);
          const slots = getSlotsByDay(dayNumber);

          return (
            <div key={dayNumber} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => toggleDayEnabled(dayNumber)}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-300 peer-focus:outline-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                  <span className="ml-3 text-lg font-medium text-gray-900">{dayName}</span>
                </div>

                {isEnabled && (
                  <button
                    onClick={() => addTimeSlot(dayNumber)}
                    disabled={isSaving}
                    className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    + Add Slot
                  </button>
                )}
              </div>

              {isEnabled && slots.length > 0 && (
                <div className="space-y-3">
                  {slots.map((slot) => (
                    <div key={slot.id} className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">From:</label>
                        <input
                          type="time"
                          value={slot.startTimeLocal}
                          onChange={(e) =>
                            updateSlotTime(slot.id, "startTimeLocal", e.target.value)
                          }
                          disabled={isSaving}
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">To:</label>
                        <input
                          type="time"
                          value={slot.endTimeLocal}
                          onChange={(e) => updateSlotTime(slot.id, "endTimeLocal", e.target.value)}
                          disabled={isSaving}
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>

                      {slots.length > 1 && (
                        <button
                          onClick={() => removeTimeSlot(slot.id)}
                          disabled={isSaving || deleteWorkingHoursMutation.isPending}
                          className="rounded-md bg-red-600 px-2 py-1 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deleteWorkingHoursMutation.isPending &&
                          slot.id === deleteWorkingHoursMutation.variables
                            ? "Removing..."
                            : "Remove"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isEnabled && slots.length === 0 && (
                <p className="text-gray-500 italic">No time slots configured</p>
              )}

              {!isEnabled && <p className="text-gray-500 italic">Not available on this day</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Working Hours"}
        </button>
      </div>
    </div>
  );
}

export default WorkingHours;
