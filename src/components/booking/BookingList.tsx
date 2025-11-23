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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Filters - Always visible */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Filter className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Filter Bookings</h3>
            {hasFilters && (
              <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Active
              </span>
            )}
          </div>
          {hasFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-4 w-4 mr-1" />
              Clear all
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleApplyFilter}
            disabled={!isFilterActive}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              isFilterActive
                ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Apply Filters
          </button>
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Loading state for refetch */}
      {isLoading && bookingsData && (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
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
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <div className="text-gray-400 mb-4">
                <Calendar className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-500 mb-4">
                {hasFilters 
                  ? "No bookings match your current filter criteria. Try adjusting your filters."
                  : "You don't have any scheduled bookings yet."
                }
              </p>
              {hasFilters && (
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Pagination */}
          {bookingsData && bookingsData.pagination.totalPages > 1 && (
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {(bookingsData.pagination.page - 1) * bookingsData.pagination.limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(
                    bookingsData.pagination.page * bookingsData.pagination.limit,
                    bookingsData.pagination.total
                  )}
                </span>{" "}
                of <span className="font-medium">{bookingsData.pagination.total}</span> results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={bookingsData.pagination.page === 1}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </button>
                <button
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={bookingsData.pagination.page === bookingsData.pagination.totalPages}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
