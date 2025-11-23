import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { getBookingDetails } from "@/functions/booking/get-booking-details";
import { formatBookingTime, formatBookingDate, getDuration } from "@/helpers/date-utils";
import { ArrowLeft, Clock, Mail } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { getOrganizerSettings, cancelBooking } from "@/functions";
import { toast } from "sonner";

const server = createServerFn({ method: "GET" }).handler(async () => {
  const userSettings = await getOrganizerSettings();
  return {
    settings: userSettings,
  };
});

export const Route = createFileRoute("/app/$bookingId")({
  component: RouteComponent,
  beforeLoad: () => server(),
});

function RouteComponent() {
  const { bookingId } = Route.useParams();
  const { settings, user } = Route.useRouteContext();
  const navigate = useNavigate();
  const getBookingDetailsFn = useServerFn(getBookingDetails);
  const cancelBookingFn = useServerFn(cancelBooking);

  const {
    data: booking,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["booking-details", bookingId],
    queryFn: () =>
      getBookingDetailsFn({
        data: {
          bookingId,
          includeOrganizerDetails: true,
        },
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: (data: { bookingId: string; username: string }) => cancelBookingFn({ data }),
    onSuccess: () => {
      toast.success("Settings updated successfully!");
      navigate({ to: "/app" });
    },
    onError: () => {
      toast.error("Failed to update settings");
    },
  });

  const handleGoBack = () => {
    navigate({ to: "/app" });
  };

  const handleReschedule = () => {
    navigate({ to: `/app/${bookingId}/reschedule` });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
        Error loading booking: {error.message}
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-700">
        Booking not found
      </div>
    );
  }

  const duration = getDuration(booking.startTime, booking.endTime);
  const isPast = new Date(booking.startTime) < new Date();

  return (
    <div className="my-4">
      <button
        onClick={handleGoBack}
        className="mb-6 flex items-center text-sm text-gray-600 transition-colors hover:text-gray-900"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Bookings
      </button>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-gray-900">{booking.title}</h1>
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Meeting Details */}
            <div className="space-y-4">
              <div className="flex items-center text-gray-900">
                <h2 className="text-lg font-semibold">Meeting Details</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Date</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatBookingDate(booking.startTime, settings?.workingTimezone)}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700">Time</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatBookingTime(
                      booking.startTime,
                      booking.endTime,
                      settings?.workingTimezone,
                    )}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700">Duration</h3>
                  <p className="mt-1 text-sm text-gray-900">{duration} minutes</p>
                </div>

                {booking.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Description</h3>
                    <p className="mt-1 text-sm whitespace-pre-wrap text-gray-900">
                      {booking.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Attendee Information */}
            <div className="space-y-4">
              <div className="flex items-center text-gray-900">
                <h2 className="text-lg font-semibold">Attendee Information</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Name</h3>
                  <p className="mt-1 text-sm text-gray-900">{booking.attendantName}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700">Email</h3>
                  <div className="mt-1 flex items-center text-sm text-gray-900">
                    <Mail className="mr-2 h-4 w-4 text-gray-400" />
                    <a
                      href={`mailto:${booking.attendantEmail}`}
                      className="text-blue-600 hover:text-blue-500"
                    >
                      {booking.attendantEmail}
                    </a>
                  </div>
                </div>

                {/* Additional attendees if metadata exists */}
                {booking.metadata && booking.metadata.additionalAttendees && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Additional Attendees</h3>
                    <ul className="mt-1 text-sm text-gray-900">
                      {booking.metadata.additionalAttendees.map((attendee: any, index: number) => (
                        <li key={index}>
                          {attendee.name} ({attendee.email})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                <div className="flex items-center">
                  <span className="font-medium">Booking ID:</span>
                  <span className="ml-1">{booking.id}</span>
                </div>
                <div className="mt-1 flex items-center">
                  <Clock className="mr-1 h-3 w-3" />
                  <span>Created on: {new Date(booking.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex space-x-3">
                <Link
                  to="/app"
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Bookings
                </Link>
                {!isPast && (
                  <>
                    <button
                      onClick={handleReschedule}
                      className="inline-flex items-center rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Reschedule
                    </button>
                    <button
                      onClick={() =>
                        cancelMutation.mutate({ bookingId: booking.id, username: user.username })
                      }
                      className="inline-flex items-center rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
                    >
                      Cancel Booking
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
