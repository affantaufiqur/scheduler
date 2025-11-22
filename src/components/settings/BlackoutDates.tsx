import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/Input";
import {
  getBlackoutDates,
  createBlackoutDateFn,
  deleteBlackoutDateFn,
  bulkUpsertBlackoutDatesFn,
} from "@/functions/organizer-settings/blackout-days";

interface BlackoutDate {
  id: string;
  date: string;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function BlackoutDates() {
  const queryClient = useQueryClient();

  // Form states
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [bulkDatesText, setBulkDatesText] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Calculate minimum date (tomorrow)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateString = minDate.toISOString().split("T")[0];

  // Fetch blackout dates
  const {
    data: blackoutDates = [],
    isLoading,
    error,
  } = useQuery<BlackoutDate[]>({
    queryKey: ["blackout-dates"],
    queryFn: () => getBlackoutDates(),
  });

  // Create new blackout date
  const createMutation = useMutation({
    mutationFn: (data: { date: string; reason?: string }) => createBlackoutDateFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blackout-dates"] });
      setNewDate("");
      setNewReason("");
      toast.success("Blackout date added successfully!");
    },
    onError: () => {
      toast.error("Failed to add blackout date");
    },
  });

  // Delete blackout date
  const deleteMutation = useMutation({
    mutationFn: (data: { id: string }) => deleteBlackoutDateFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blackout-dates"] });
      toast.success("Blackout date removed successfully!");
    },
    onError: () => {
      toast.error("Failed to remove blackout date");
    },
  });

  // Bulk import blackout dates
  const bulkImportMutation = useMutation({
    mutationFn: (dates: Array<{ date: string; reason?: string }>) =>
      bulkUpsertBlackoutDatesFn({ data: dates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blackout-dates"] });
      setBulkDatesText("");
      setShowBulkImport(false);
      toast.success("Blackout dates imported successfully!");
    },
    onError: () => {
      toast.error("Failed to import blackout dates");
    },
  });

  const handleAddDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;

    // Check for duplicate
    const isDuplicate = blackoutDates.some((date) => date.date === newDate);
    if (isDuplicate) {
      toast.error("This date is already in your blackout dates");
      return;
    }

    createMutation.mutate({
      date: newDate,
      reason: newReason || undefined,
    });
  };

  const handleDeleteDate = (id: string) => {
    if (window.confirm("Are you sure you want to remove this blackout date?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleBulkImport = () => {
    if (!bulkDatesText.trim()) return;

    const lines = bulkDatesText.trim().split("\n");
    const dates: Array<{ date: string; reason?: string }> = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Parse line - can be just a date or date,reason
      const [dateStr, ...reasonParts] = trimmedLine.split(",");

      // Validate date format
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        toast.error(`Invalid date format: ${dateStr}`);
        return;
      }

      dates.push({
        date: dateStr, // Pass as string, will be transformed in server function
        reason: reasonParts.length > 0 ? reasonParts.join(",").trim() : undefined,
      });
    }

    if (dates.length === 0) {
      toast.error("No valid dates found in the input");
      return;
    }

    bulkImportMutation.mutate(dates);
  };

  if (isLoading) return <div className="p-6">Loading blackout dates...</div>;
  if (error) return <div className="p-6 text-red-600">Error loading blackout dates</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-xl font-semibold text-black">Blackout Dates</h2>
        <p className="mb-6 text-sm text-gray-600">
          Block specific dates from being available for meetings, regardless of your weekly
          schedule.
        </p>
      </div>

      {/* Add new blackout date form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-medium text-black">Add New Blackout Date</h3>
        <form onSubmit={handleAddDate} className="space-y-4">
          <Input.Root>
            <Input.Label htmlFor="date">Date</Input.Label>
            <Input.Field
              id="date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={minDateString}
              required
            />
          </Input.Root>

          <Input.Root>
            <Input.Label htmlFor="reason">Reason (optional)</Input.Label>
            <Input.Field
              id="reason"
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="e.g., Holiday, Personal day, Company event"
            />
          </Input.Root>

          <button
            type="submit"
            disabled={createMutation.isPending || !newDate}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {createMutation.isPending ? "Adding..." : "Add Blackout Date"}
          </button>
        </form>
      </div>

      {/* Current blackout dates */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-medium text-black">
          Current Blackout Dates ({blackoutDates.length})
        </h3>

        {blackoutDates.length === 0 ? (
          <p className="text-gray-500">No blackout dates configured yet.</p>
        ) : (
          <div className="space-y-3">
            {blackoutDates
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((date) => (
                <div
                  key={date.id}
                  className="flex items-center justify-between rounded-md bg-gray-50 p-3"
                >
                  <div className="flex-1">
                    <div className="font-medium text-black">
                      {new Date(date.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                    {date.reason && <div className="mt-1 text-sm text-gray-600">{date.reason}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDate(date.id)}
                    disabled={deleteMutation.isPending}
                    className="ml-4 rounded-md px-3 py-1 text-red-600 hover:bg-red-50 hover:text-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
