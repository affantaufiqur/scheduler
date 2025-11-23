import { useNavigate } from "@tanstack/react-router";
import { formatBookingTime, formatBookingDate, isBookingPast } from "@/helpers/date-utils";

interface BookingCardProps {
  id: string;
  title: string;
  description: string | null;
  attendantName: string;
  attendantEmail: string;
  startTime: string;
  endTime: string;
  userTimezone?: string;
  showDetails?: boolean;
}

export function BookingCard({
  id,
  title,
  description,
  attendantName,
  attendantEmail,
  startTime,
  endTime,
  userTimezone = "local",
  showDetails = true,
}: BookingCardProps) {
  const navigate = useNavigate();
  const isPast = isBookingPast(startTime, userTimezone);

  const handleViewDetails = () => {
    navigate({ to: `/app/${id}` });
  };

  return (
    <div
      className={`rounded-lg border ${
        isPast ? "border-gray-200 bg-gray-50" : "border-gray-200 bg-white"
      } p-4 transition-all hover:border-gray-400`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${isPast ? "text-gray-500" : "text-gray-900"}`}>
            {title}
          </h3>
          {description && (
            <p className={`mt-1 text-sm ${isPast ? "text-gray-400" : "text-gray-600"}`}>
              {description}
            </p>
          )}
        </div>
        {showDetails && (
          <div className="ml-4 flex space-x-2">
            <button
              onClick={handleViewDetails}
              className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              View Details
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <div className={`text-sm ${isPast ? "text-gray-400" : "text-gray-600"}`}>
          <div className="flex items-center">
            <span className="font-medium">Date:</span>
            <span className="ml-2">{formatBookingDate(startTime, userTimezone)}</span>
          </div>
          <div className="mt-1 flex items-center">
            <span className="font-medium">Time:</span>
            <span className="ml-2">
              {formatBookingTime(startTime, endTime, userTimezone, true)}
            </span>
          </div>
          <div className="mt-1 flex items-center">
            <span className="font-medium">With:</span>
            <span className="ml-2">
              {attendantName} ({attendantEmail})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
