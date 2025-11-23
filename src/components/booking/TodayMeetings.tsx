import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, Clock, User } from "lucide-react";
import { getTodayBookings } from "@/functions/booking/get-user-bookings";
import { BookingCard } from "./BookingCard";
import { formatBookingTime, isBookingPast } from "@/helpers/date-utils";

interface TodayMeetingsProps {
  userId: string;
  userTimezone?: string;
}

export function TodayMeetings({ userId, userTimezone = "local" }: TodayMeetingsProps) {
  const getTodayBookingsFn = useServerFn(getTodayBookings);

  const {
    data: todayBookingsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["today-bookings", userId],
    queryFn: () => getTodayBookingsFn({ data: {} }),
    refetchInterval: 60000, // Refetch every minute to keep the schedule up to date
  });

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          Error loading today's meetings: {error.message}
        </div>
      </div>
    );
  }

  if (!todayBookingsData || todayBookingsData.bookings.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Today's Schedule</h3>
          </div>
        </div>
        <div className="p-6 text-center">
          <div className="text-gray-400 mb-3">
            <Calendar className="h-10 w-10 mx-auto" />
          </div>
          <p className="text-gray-500 text-sm">No meetings scheduled for today</p>
        </div>
      </div>
    );
  }

  // Sort bookings by start time
  const sortedBookings = [...todayBookingsData.bookings].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Today's Schedule</h3>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {sortedBookings.length} meeting{sortedBookings.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {sortedBookings.map((booking) => {
          const isPast = isBookingPast(booking.startTime, userTimezone);
          return (
            <div
              key={booking.id}
              className={`p-4 ${isPast ? "bg-gray-50" : "hover:bg-gray-50"} transition-colors cursor-pointer`}
              onClick={() => {
                window.location.href = `/app/${booking.id}`;
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className={`text-base font-medium truncate ${isPast ? "text-gray-500" : "text-gray-900"}`}>
                    {booking.title}
                  </h4>
                  {booking.description && (
                    <p className={`mt-1 text-sm truncate ${isPast ? "text-gray-400" : "text-gray-600"}`}>
                      {booking.description}
                    </p>
                  )}
                  
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center text-sm">
                      <Clock className={`h-4 w-4 mr-2 flex-shrink-0 ${isPast ? "text-gray-400" : "text-gray-500"}`} />
                      <span className={isPast ? "text-gray-500" : "text-gray-900"}>
                        {formatBookingTime(booking.startTime, booking.endTime, userTimezone, true)}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <User className={`h-4 w-4 mr-2 flex-shrink-0 ${isPast ? "text-gray-400" : "text-gray-500"}`} />
                      <span className={isPast ? "text-gray-500" : "text-gray-900"}>
                        {booking.attendantName}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <button
                    className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-md border transition-colors ${
                      isPast
                        ? "border-gray-200 text-gray-400"
                        : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
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
