import { getAvailableSlotsByUsername } from "@/functions";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DateTime } from "luxon";
import { useState } from "react";
import { AvailabilitySlots } from "@/components/booking/AvailabilitySlots";
import { BookingForm } from "@/components/booking/BookingForm";
import { BookingConfirmation } from "@/components/booking/BookingConfirmation";

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
  validateSearch: (search: Record<string, string>) => {
    return {
      date: search.date as string | undefined,
      startTime: search.startTime as string | undefined,
      endTime: search.endTime as string | undefined,
      success: search.success as string | undefined,
    };
  },
});

function RouteComponent() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [bookingResult, setBookingResult] = useState<any>(null);

  // Automatically detect attendee's timezone
  const attendeeTimezone = DateTime.local().zoneName || "UTC";

  // Find the selected slot based on query parameters
  const selectedSlot =
    search.startTime && search.endTime
      ? data.slots.find(
          (slot: any) => slot.startTime === search.startTime && slot.endTime === search.endTime,
        )
      : undefined;

  const handleSlotSelect = (slot: any) => {
    navigate({
      search: {
        date: DateTime.fromISO(slot.startTime).toFormat("yyyy-MM-dd"),
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
    });
  };

  const handleBookingSuccess = (booking: any) => {
    setBookingResult(booking);
    navigate({
      search: {
        success: "true",
      },
    });
  };

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

  // If booking was successful, show confirmation
  if (bookingResult && search.success === "true") {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
            <h1 className="text-3xl font-bold text-gray-800">{data.username}'s Booking</h1>
            <p className="mt-2 text-gray-600">Your meeting has been confirmed</p>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span>Organizer: {data.settings?.workingTimezone}</span>
              <span>•</span>
              <span>Your timezone: {attendeeTimezone}</span>
            </div>
          </div>

          <BookingConfirmation
            booking={bookingResult}
            attendeeTimezone={attendeeTimezone}
            organizerTimezone={data.settings?.workingTimezone || "UTC"}
            username={data.username}
          />
        </div>
      </div>
    );
  }

  // If a slot is selected, show the booking form
  if (selectedSlot && !search.success) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
            <h1 className="text-3xl font-bold text-gray-800">{data.username}'s Booking</h1>
            <p className="mt-2 text-gray-600">Complete your booking details</p>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span>Organizer: {data.settings?.workingTimezone}</span>
              <span>•</span>
              <span>Your timezone: {attendeeTimezone}</span>
            </div>
          </div>

          <BookingForm
            username={data.username}
            slot={selectedSlot}
            settings={data.settings}
            attendeeTimezone={attendeeTimezone}
            onBookingSuccess={handleBookingSuccess}
          />
        </div>
      </div>
    );
  }

  // Default view: show availability slots
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

        <AvailabilitySlots
          slots={data.slots}
          attendeeTimezone={attendeeTimezone}
          onSlotSelect={handleSlotSelect}
        />
      </div>
    </div>
  );
}
