import { getAvailableSlotsByUsername } from "@/functions";
import { createFileRoute } from "@tanstack/react-router";
import { DateTime } from "luxon";

export const Route = createFileRoute("/$username")({
  component: RouteComponent,
  loader: async ({ params }) => {
    const username = params.username;
    try {
      // get available slots using the username
      const slots = await getAvailableSlotsByUsername({
        data: { username },
      });
      return {
        username,
        settings: slots.settings,
        slots: slots.slots || [],
        error: null,
      };
    } catch (error) {
      return {
        username,
        settings: null,
        slots: [],
        error: error instanceof Error ? error.message : "User not found",
      };
    }
  },
});

function RouteComponent() {
  const data = Route.useLoaderData();

  // Automatically detect attendee's timezone
  const attendeeTimezone = DateTime.local().zoneName || "UTC";

  // If there's an error, display it
  if (data.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <h1 className="mb-4 text-2xl font-bold text-gray-800">Error</h1>
          <p className="text-gray-600">{data.error}</p>
        </div>
      </div>
    );
  }

  // Group slots by date for better organization
  const slotsByDate = data.slots.reduce(
    (acc: Record<string, Array<(typeof data.slots)[number]>>, slot) => {
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-800">
              {data.username}'s Availability - {data.settings?.defaultMeetingDuration} Min
            </h1>
            <p className="mt-2 text-gray-600">Select a time slot to book a meeting</p>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span>Organizer: {data.settings?.workingTimezone}</span>
              <span>•</span>
              <span>Your timezone: {attendeeTimezone}</span>
            </div>
          </div>
        </div>

        {data.slots.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-md">
            <p className="text-lg text-gray-600">No available slots found for {data.username}</p>
            <p className="mt-2 text-gray-500">Please try again later or contact them directly.</p>
          </div>
        ) : (
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

                      return (
                        <div
                          key={`${slot.startTime}-${index}`}
                          className="cursor-pointer rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-400 hover:shadow-sm"
                          onClick={() => {
                            // TODO: Implement booking functionality
                            alert(
                              `Slot ${startTime.toFormat("h:mm a")} - ${endTime.toFormat("h:mm a")} clicked`,
                            );
                          }}
                        >
                          <div className="text-center">
                            <div className="text-lg font-medium text-gray-900">
                              {attendeeStartTime.toFormat("h:mm a")}
                            </div>
                            <div className="text-sm text-gray-500">
                              {attendeeEndTime.toFormat("h:mm a")}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {slot.duration} minutes
                            </div>
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
        )}
      </div>
    </div>
  );
}
