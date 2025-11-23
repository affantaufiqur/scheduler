import { DateTime } from "luxon";

interface Slot {
  startTime: string;
  endTime: string;
  duration: number;
  timezone: string;
  available: boolean;
}

interface AvailabilitySlotsProps {
  slots: Slot[];
  attendeeTimezone: string;
  onSlotSelect: (slot: Slot) => void;
  selectedSlot?: {
    startTime: string;
    endTime: string;
  };
}

export function AvailabilitySlots({
  slots,
  attendeeTimezone,
  onSlotSelect,
  selectedSlot,
}: AvailabilitySlotsProps) {
  // Group slots by date for better organization
  const slotsByDate = slots.reduce(
    (acc: Record<string, Slot[]>, slot) => {
      const date = DateTime.fromISO(slot.startTime).toFormat("yyyy-MM-dd");
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(slot);
      return acc;
    },
    {},
  );

  // Sort dates
  const sortedDates = Object.keys(slotsByDate).sort();

  if (slots.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-md">
        <p className="text-lg text-gray-600">No available slots found</p>
        <p className="mt-2 text-gray-500">Please try again later or contact them directly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => {
        // Convert organizer date to attendee's local date
        const organizerDate = DateTime.fromISO(date);
        const attendeeDate = organizerDate.setZone(attendeeTimezone);

        return (
          <div key={date} className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">
              {attendeeDate.toFormat("EEEE, MMMM d, yyyy")}
              {attendeeDate.toFormat("yyyy-MM-dd") !== date && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (Organizer: {organizerDate.toFormat("EEEE, MMMM d, yyyy")})
                </span>
              )}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {slotsByDate[date].map((slot, index) => {
                // Convert to organizer timezone for display
                const startTime = DateTime.fromISO(slot.startTime, { zone: slot.timezone });
                const endTime = DateTime.fromISO(slot.endTime, { zone: slot.timezone });

                // Convert to attendee timezone
                const attendeeStartTime = startTime.setZone(attendeeTimezone);
                const attendeeEndTime = endTime.setZone(attendeeTimezone);

                // Check if this slot is selected
                const isSelected =
                  selectedSlot &&
                  selectedSlot.startTime === slot.startTime &&
                  selectedSlot.endTime === slot.endTime;

                return (
                  <div
                    key={`${slot.startTime}-${index}`}
                    className={`cursor-pointer rounded-lg border p-4 transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-200 hover:border-blue-400 hover:shadow-sm"
                    }`}
                    onClick={() => onSlotSelect(slot)}
                  >
                    <div className="text-center">
                      <div className="text-lg font-medium text-gray-900">
                        {attendeeStartTime.toFormat("h:mm a")}
                      </div>
                      <div className="text-sm text-gray-500">
                        {attendeeEndTime.toFormat("h:mm a")}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">{slot.duration} minutes</div>
                      {attendeeTimezone !== slot.timezone && (
                        <div className="mt-2 border-t pt-2">
                          <div className="text-xs text-gray-400">
                            Organizer: {startTime.toFormat("h:mm a")} -{" "}
                            {endTime.toFormat("h:mm a")}
                          </div>
                          <div className="text-xs text-gray-400">({slot.timezone})</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
