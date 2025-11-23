import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, Clock, User } from "lucide-react";
import { getTodayBookings } from "@/functions/booking/get-user-bookings";
import { formatBookingTime, isBookingPast } from "@/helpers/date-utils";
import type { OrganizerSettings } from "@/configs/db/schema";

interface TodayMeetingsProps {
  userId: string;
  settings: OrganizerSettings;
}

export function TodayMeetings({ userId, settings }: TodayMeetingsProps) {
  const userTimezone = settings.workingTimezone || "local";
  const getTodayBookingsFn = useServerFn(getTodayBookings);

  const {
    data: todayBookingsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["today-bookings", userId],
    queryFn: () => getTodayBookingsFn(),
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          Error loading today's meetings: {error.message}
        </div>
      </div>
    );
  }

  if (!todayBookingsData || todayBookingsData.bookings.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Today's Schedule</h3>
          </div>
        </div>
        <div className="p-6 text-center">
          <div className="mb-3 text-gray-400">
            <Calendar className="mx-auto h-10 w-10" />
          </div>
          <p className="text-sm text-gray-500">No meetings scheduled for today</p>
        </div>
      </div>
    );
  }

  const bookings = todayBookingsData.bookings;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Today's Schedule</h3>
          </div>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            {bookings.length} meeting{bookings.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {bookings.map((booking) => {
          const isPast = isBookingPast(booking.endTime, userTimezone);
          return (
            <div
              key={booking.id}
              className={`p-4 ${isPast ? "bg-red-50" : "hover:bg-gray-50"} cursor-pointer transition-colors`}
              onClick={() => {
                window.location.href = `/app/${booking.id}`;
              }}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h4
                    className={`truncate text-base font-medium ${isPast ? "text-gray-500" : "text-gray-900"}`}
                  >
                    {booking.title}
                  </h4>
                  {booking.description && (
                    <p
                      className={`mt-1 truncate text-sm ${isPast ? "text-gray-400" : "text-gray-600"}`}
                    >
                      {booking.description}
                    </p>
                  )}

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center text-sm">
                      <Clock
                        className={`mr-2 h-4 w-4 shrink-0 ${isPast ? "text-gray-400" : "text-gray-500"}`}
                      />
                      <span className={isPast ? "text-gray-500" : "text-gray-900"}>
                        {formatBookingTime(booking.startTime, booking.endTime, userTimezone, true)}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <User
                        className={`mr-2 h-4 w-4 shrink-0 ${isPast ? "text-gray-400" : "text-gray-500"}`}
                      />
                      <span className={isPast ? "text-gray-500" : "text-gray-900"}>
                        {booking.attendantName}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="ml-4 shrink-0">
                  <button
                    className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                      isPast
                        ? "border-gray-200 text-gray-400"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
