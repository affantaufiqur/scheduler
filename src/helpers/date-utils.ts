import { DateTime } from "luxon";

export function formatBookingTime(
  startTime: string,
  endTime: string,
  timezone: string = "local",
  use24Hour: boolean = true,
): string {
  const start = DateTime.fromISO(startTime);
  const end = DateTime.fromISO(endTime);

  if (!start.isValid || !end.isValid) {
    return "Invalid time";
  }

  const displayStart = timezone === "local" ? start.toLocal() : start.setZone(timezone);
  const displayEnd = timezone === "local" ? end.toLocal() : end.setZone(timezone);

  const timeFormat = use24Hour ? "HH:mm" : "h:mm a";

  return `${displayStart.toFormat(timeFormat)} - ${displayEnd.toFormat(timeFormat)} ${
    timezone === "local" ? displayStart.toFormat("ZZZZ") : timezone
  }`;
}

export function formatBookingDate(startTime: string, timezone: string = "local"): string {
  const start = DateTime.fromISO(startTime);

  if (!start.isValid) {
    return "Invalid date";
  }

  const displayStart = timezone === "local" ? start.toLocal() : start.setZone(timezone);

  return displayStart.toFormat("EEEE, MMMM d, yyyy");
}

export function formatBookingDateTime(
  startTime: string,
  endTime: string,
  timezone: string = "local",
  use24Hour: boolean = true,
): string {
  return `${formatBookingDate(startTime, timezone)} at ${formatBookingTime(
    startTime,
    endTime,
    timezone,
    use24Hour,
  )}`;
}

export function isBookingToday(startTime: string, timezone: string = "local"): boolean {
  const bookingDate = DateTime.fromISO(startTime);
  const now = timezone === "local" ? DateTime.now() : DateTime.now().setZone(timezone);
  const displayBookingDate =
    timezone === "local" ? bookingDate.toLocal() : bookingDate.setZone(timezone);

  if (!displayBookingDate.isValid) {
    return false;
  }

  return displayBookingDate.hasSame(now, "day");
}

export function isBookingPast(endTime: string, timezone: string = "local"): boolean {
  const bookingDate = DateTime.fromISO(endTime); // UTC end time
  const now = timezone === "local" ? DateTime.now() : DateTime.now().setZone(timezone);
  const displayBookingDate =
    timezone === "local" ? bookingDate.toLocal() : bookingDate.setZone(timezone);

  if (!displayBookingDate.isValid) {
    return false;
  }

  // The booking is considered past if its end time is at or before the current time.
  return now >= displayBookingDate;
}

export function getDuration(startTime: string, endTime: string): number {
  const start = DateTime.fromISO(startTime);
  const end = DateTime.fromISO(endTime);

  if (!start.isValid || !end.isValid) {
    return 0;
  }

  return end.diff(start, "minutes").minutes;
}
