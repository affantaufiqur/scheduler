import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookingList } from "@/components/booking/BookingList";
import { TodayMeetings } from "@/components/booking/TodayMeetings";
import { getOrganizerSettings } from "@/functions/organizer-settings/get";

export const Route = createFileRoute("/app/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = Route.useRouteContext();
  const getOrganizerSettingsFn = useServerFn(getOrganizerSettings);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["organizer-settings", user.id],
    queryFn: () => getOrganizerSettingsFn(),
  });

  // Use user's working timezone from settings, fallback to "local"
  const userTimezone = settings?.workingTimezone || "local";

  if (settingsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 py-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Your Bookings</h1>
          <p className="text-gray-600">View and manage all your scheduled meetings</p>
        </div>
        <BookingList userId={user.id} userTimezone={userTimezone} />
      </div>
      <div className="lg:col-span-1">
        <TodayMeetings userId={user.id} userTimezone={userTimezone} />
      </div>
    </div>
  );
}
