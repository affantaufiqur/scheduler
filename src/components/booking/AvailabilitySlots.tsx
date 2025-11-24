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
  const slotsByDate = slots.reduce((acc: Record<string, Slot[]>, slot) => {
    // Parse as UTC first, then convert to attendee timezone to get the correct date
    const dateInAttendeeTimezone = DateTime.fromISO(slot.startTime, { zone: "utc" })
      .setZone(attendeeTimezone)
      .toFormat("yyyy-MM-dd");
    if (!acc[dateInAttendeeTimezone]) {
      acc[dateInAttendeeTimezone] = [];
    }
    acc[dateInAttendeeTimezone].push(slot);
    return acc;
  }, {});

  // Sort dates
  const sortedDates = Object.keys(slotsByDate).sort();

  if (slots.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 from-gray-50 to-gray-100 px-6 py-16">
        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <svg
              className="h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No available slots</h3>
          <p className="mt-1 text-sm text-gray-600">
            Please try different dates or contact them directly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sortedDates.map((date) => {
        // Date is already in attendee's timezone from grouping
        const attendeeDate = DateTime.fromISO(date);

        return (
          <div key={date} className="space-y-4">
            {/* Date Header */}
            <div className="flex items-baseline justify-between border-b border-gray-200 pb-3">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {attendeeDate.toFormat("EEEE")}
                </h2>
                <p className="text-sm text-gray-600">{attendeeDate.toFormat("MMMM d, yyyy")}</p>
              </div>
            </div>

            {/* Time Slots Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {slotsByDate[date].map((slot, index) => {
                // Parse UTC timestamps first (they are already in UTC from the server)
                const startTimeUTC = DateTime.fromISO(slot.startTime, { zone: "utc" });
                const endTimeUTC = DateTime.fromISO(slot.endTime, { zone: "utc" });

                // Convert to organizer timezone for display
                const startTime = startTimeUTC.setZone(slot.timezone);
                const endTime = endTimeUTC.setZone(slot.timezone);

                // Convert to attendee timezone
                const attendeeStartTime = startTimeUTC.setZone(attendeeTimezone);
                const attendeeEndTime = endTimeUTC.setZone(attendeeTimezone);

                // Check if this slot is selected
                const isSelected =
                  selectedSlot &&
                  selectedSlot.startTime === slot.startTime &&
                  selectedSlot.endTime === slot.endTime;

                return (
                  <button
                    key={`${slot.startTime}-${index}`}
                    onClick={() => onSlotSelect(slot)}
                    className={`group relative rounded-lg p-4 transition-all duration-200 ${
                      isSelected
                        ? "border border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10"
                        : "border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/5"
                    }`}
                  >
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                        <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}

                    <div className="text-left">
                      {/* Time */}
                      <div className="mb-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-gray-900">
                            {attendeeStartTime.toFormat("HH:mm")}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          until {attendeeEndTime.toFormat("HH:mm")}
                        </div>
                      </div>

                      {/* Organizer timezone info */}
                      {attendeeTimezone !== slot.timezone && (
                        <div className="mt-3 space-y-1 border-t border-gray-100 pt-3">
                          <p className="text-xs text-gray-500">Organizer time:</p>
                          <p className="text-xs font-medium text-gray-600">
                            {startTime.toFormat("HH:mm")} - {endTime.toFormat("HH:mm")}
                          </p>
                          <p className="text-xs text-gray-400">({slot.timezone})</p>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
