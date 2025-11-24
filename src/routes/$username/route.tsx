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
      // console.log("slots", slots);
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
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Oops!</h1>
          <p className="text-slate-600">{data.error}</p>
        </div>
      </div>
    );
  }

  // Header component
  const BookingHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="mb-8 space-y-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-600">{subtitle}</p>
      </div>

      {/* Meta information */}
      <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center">
        <span>
          <span className="font-semibold text-slate-900">Organizer:</span>{" "}
          {data.settings?.workingTimezone}
        </span>
        <span className="hidden text-slate-300 sm:inline">•</span>
        <span>
          <span className="font-semibold text-slate-900">Your timezone:</span> {attendeeTimezone}
        </span>
      </div>
    </div>
  );

  // If booking was successful, show confirmation
  if (bookingResult && search.success === "true") {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <BookingHeader
            title={`${data.username}'s Booking`}
            subtitle="Your meeting has been confirmed"
          />

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
      <div className="min-h-screen bg-white py-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <BookingHeader
            title={`${data.username}'s Booking`}
            subtitle="Complete your booking details"
          />

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
    <div className="min-h-screen bg-white py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <BookingHeader
          title={`${data.username}'s Availability`}
          subtitle={`Select a time slot to book a ${data.settings?.defaultMeetingDuration}-minute meeting`}
        />

        <AvailabilitySlots
          slots={data.slots}
          attendeeTimezone={attendeeTimezone}
          onSlotSelect={handleSlotSelect}
        />
      </div>
    </div>
  );
}
