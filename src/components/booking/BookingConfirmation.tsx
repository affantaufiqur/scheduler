import { DateTime } from "luxon";

interface BookingConfirmationProps {
  booking: {
    id: string;
    attendantName: string;
    attendantEmail: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    createdAt: string;
  };
  attendeeTimezone: string;
  organizerTimezone: string;
  username: string;
}

export function BookingConfirmation({
  booking,
  attendeeTimezone,
  organizerTimezone,
  username,
}: BookingConfirmationProps) {
  // Convert times to attendee timezone
  const startTime = DateTime.fromISO(booking.startTime, { zone: organizerTimezone });
  const endTime = DateTime.fromISO(booking.endTime, { zone: organizerTimezone });
  const attendeeStartTime = startTime.setZone(attendeeTimezone);
  const attendeeEndTime = endTime.setZone(attendeeTimezone);

  // Calculate duration
  const duration = Math.round(endTime.diff(startTime, "minutes").minutes);

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Booking Confirmed!</h2>
        <p className="mt-2 text-gray-600">
          Your meeting with {username} has been scheduled successfully.
        </p>
      </div>

      <div className="mb-6 rounded-lg bg-gray-50 p-4">
        <h3 className="mb-3 font-medium text-gray-700">Meeting Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Meeting ID:</span>
            <span className="text-gray-900">{booking.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Title:</span>
            <span className="text-gray-900">{booking.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Date:</span>
            <span className="text-gray-900">{attendeeStartTime.toFormat("EEEE, MMMM d, yyyy")}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Time:</span>
            <span className="text-gray-900">
              {attendeeStartTime.toFormat("h:mm a")} - {attendeeEndTime.toFormat("h:mm a")} (
              {attendeeTimezone})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Duration:</span>
            <span className="text-gray-900">{duration} minutes</span>
          </div>
          {attendeeTimezone !== organizerTimezone && (
            <div className="pt-2 text-xs text-gray-500 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="font-medium">Organizer's time:</span>
                <span>
                  {startTime.toFormat("h:mm a")} - {endTime.toFormat("h:mm a")} ({organizerTimezone})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {booking.description && (
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 font-medium text-gray-700">Description</h3>
          <p className="text-sm text-gray-600">{booking.description}</p>
        </div>
      )}

      <div className="mb-6 rounded-lg bg-blue-50 p-4">
        <h3 className="mb-2 font-medium text-blue-900">What's Next?</h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-blue-800">
          <li>A calendar invitation has been sent to {booking.attendantEmail}</li>
          <li>You'll receive a reminder email before the meeting</li>
          <li>You can reschedule or cancel if needed</li>
        </ul>
      </div>

      <div className="text-center">
        <button
          onClick={() => window.location.reload()}
          className="rounded-md border border-transparent bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Book Another Meeting
        </button>
      </div>
    </div>
  );
}
