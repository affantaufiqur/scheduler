import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { DateTime } from "luxon";
import { AvailabilitySlots } from "@/components/booking/AvailabilitySlots";
import { getBookingDetails } from "@/functions/booking/get-booking-details";
import { getAvailableSlotsByUsername } from "@/functions/booking/get-available-slots";
import { rescheduleBooking } from "@/functions/booking/reschedule-booking";
import { toast } from "sonner";

const getRescheduleData = createServerFn({ method: "GET" })
  .inputValidator((data: { bookingId: string }) => data)
  .handler(async ({ data }) => {
    const bookingId = data.bookingId;

    // Fetch booking details with organizer info
    const booking = await getBookingDetails({
      data: {
        bookingId,
        includeOrganizerDetails: true,
      },
    });

    if (!booking.organizer) {
      throw new Error("Organizer information not found");
    }

    const availabilityData = await getAvailableSlotsByUsername({
      data: {
        username: booking.organizer.username,
      },
    });

    return {
      booking,
      availabilityData,
    };
  });

export const Route = createFileRoute("/app/$bookingId_/reschedule")({
  component: RouteComponent,
  loader: async ({ params }) => {
    return await getRescheduleData({ data: { bookingId: params.bookingId } });
  },
});

interface Slot {
  startTime: string;
  endTime: string;
  duration: number;
  timezone: string;
  available: boolean;
}

function RouteComponent() {
  const navigate = useNavigate();
  const { booking, availabilityData } = Route.useLoaderData();
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const rescheduleBookingFn = useServerFn(rescheduleBooking);

  const rescheduleMutation = useMutation({
    mutationFn: async (slot: Slot) => {
      return await rescheduleBookingFn({
        data: {
          bookingId: booking.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
      });
    },
    onSuccess: () => {
      // Navigate back to booking details
      navigate({ to: "/app/$bookingId", params: { bookingId: booking.id } });
      toast.success("Booking rescheduled successfully!");
    },
  });

  const handleSlotSelect = (slot: Slot) => {
    setSelectedSlot(slot);
  };

  const handleReschedule = () => {
    if (!selectedSlot) return;
    rescheduleMutation.mutate(selectedSlot);
  };

  // Use attendant's timezone from booking
  const attendeeTimezone = booking.attendantTimezone;

  // Current booking times in attendee timezone
  const currentStart = DateTime.fromISO(booking.startTime).setZone(
    availabilityData.settings.workingTimezone,
  );
  const currentEnd = DateTime.fromISO(booking.endTime).setZone(
    availabilityData.settings.workingTimezone,
  );

  return (
    <div className="min-h-screen from-gray-50 to-gray-100 pb-32">
      <div className="my-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate({ to: "/app/$bookingId", params: { bookingId: booking.id } })}
            className="mb-4 flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to booking
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Reschedule Meeting</h1>
          <p className="mt-2 text-gray-600">Select a new time for your meeting</p>
        </div>

        {/* Current Booking Card */}
        <div className="sticky top-0 z-30 mb-8 w-full border-b border-b-gray-100 bg-white py-4">
          <div className="flex items-start gap-4 bg-white">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-gray-500">Date</p>
              <p className="text-sm font-semibold text-gray-900">
                {currentStart.toFormat("EEEE, MMMM d, yyyy")}
              </p>
            </div>

            <div className="flex flex-col items-start gap-1">
              <p className="text-xs font-medium text-gray-500">Time</p>
              <p className="text-sm font-semibold text-gray-900">
                {currentStart.toFormat("HH:mm")} - {currentEnd.toFormat("HH:mm")} (
                {availabilityData.settings.workingTimezone})
              </p>
            </div>
          </div>
          {selectedSlot && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => setSelectedSlot(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={rescheduleMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={rescheduleMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {rescheduleMutation.isPending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Rescheduling...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Confirm Reschedule
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Available Slots Section */}
        <div className="">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Select New Time</h2>
            <p className="mt-1 text-sm text-gray-600">
              Choose from available slots in the next 14 days
            </p>
          </div>

          <AvailabilitySlots
            slots={availabilityData.slots}
            attendeeTimezone={attendeeTimezone}
            onSlotSelect={handleSlotSelect}
            selectedSlot={
              selectedSlot
                ? {
                    startTime: selectedSlot.startTime,
                    endTime: selectedSlot.endTime,
                  }
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
