import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Calendar, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import { getUserBookings } from "@/functions/booking/get-user-bookings";
import { BookingCard } from "./BookingCard";
import { formatBookingDateTime, isBookingToday } from "@/helpers/date-utils";

interface BookingListProps {
  userId: string;
  userTimezone?: string;
}

export function BookingList({ userId, userTimezone = "local" }: BookingListProps) {
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");
  const [hasFilters, setHasFilters] = useState(false);

  const getUserBookingsFn = useServerFn(getUserBookings);

  // Only fetch data when filters are applied or when page changes
  const {
    data: bookingsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user-bookings", userId, page, appliedStartDate, appliedEndDate],
    queryFn: () =>
      getUserBookingsFn({
        data: {
          page,
          limit: 10,
          ...(appliedStartDate && { startDate: appliedStartDate }),
          ...(appliedEndDate && { endDate: appliedEndDate }),
        },
      }),
    enabled: true, // Always enabled but won't auto-fetch when filters change
  });

  useEffect(() => {
    setHasFilters(!!appliedStartDate || !!appliedEndDate);
  }, [appliedStartDate, appliedEndDate]);

  const handleApplyFilter = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setPage(1); // Reset to first page when applying filters
    refetch(); // Manually refetch with new filters
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setAppliedStartDate("");
    setAppliedEndDate("");
    setPage(1);
    refetch(); // Manually refetch without filters
  };

  const isFilterActive = startDate !== appliedStartDate || endDate !== appliedEndDate;

  if (isLoading && !bookingsData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Filters - Always visible */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <Filter className="mr-2 h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Filter Bookings</h3>
            {hasFilters && (
              <span className="ml-3 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                Active
              </span>
            )}
          </div>
          {hasFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700"
            >
              <X className="mr-1 h-4 w-4" />
              Clear all
            </button>
          )}
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="start-date" className="mb-2 block text-sm font-medium text-gray-700">
              From Date
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full rounded-md border border-gray-300 py-2 pr-3 pl-10 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:text-sm"
              />
            </div>
          </div>
          <div>
            <label htmlFor="end-date" className="mb-2 block text-sm font-medium text-gray-700">
              To Date
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full rounded-md border border-gray-300 py-2 pr-3 pl-10 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleApplyFilter}
            disabled={!isFilterActive}
            className={`inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
              isFilterActive
                ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                : "cursor-not-allowed bg-gray-200 text-gray-400"
            }`}
          >
            <Filter className="mr-2 h-4 w-4" />
            Apply Filters
          </button>
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Loading state for refetch */}
      {isLoading && bookingsData && (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          Error loading bookings: {error.message}
        </div>
      )}

      {/* Bookings List */}
      {!isLoading && (
        <>
          {bookingsData && bookingsData.bookings.length > 0 ? (
            <div className="space-y-4">
              {bookingsData.bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  id={booking.id}
                  title={booking.title}
                  description={booking.description}
                  attendantName={booking.attendantName}
                  attendantEmail={booking.attendantEmail}
                  startTime={booking.startTime}
                  endTime={booking.endTime}
                  userTimezone={userTimezone}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
              <div className="mb-4 text-gray-400">
                <Calendar className="mx-auto h-12 w-12" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">No bookings found</h3>
              <p className="mb-4 text-gray-500">
                {hasFilters
                  ? "No bookings match your current filter criteria. Try adjusting your filters."
                  : "You don't have any scheduled bookings yet."}
              </p>
              {hasFilters && (
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Pagination */}
          {bookingsData && bookingsData.pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {(bookingsData.pagination.page - 1) * bookingsData.pagination.limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(
                    bookingsData.pagination.page * bookingsData.pagination.limit,
                    bookingsData.pagination.total,
                  )}
                </span>{" "}
                of <span className="font-medium">{bookingsData.pagination.total}</span> results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={bookingsData.pagination.page === 1}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={bookingsData.pagination.page === bookingsData.pagination.totalPages}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
