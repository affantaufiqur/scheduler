import { DateTime } from "luxon";

/**
 * Convert a time string in user's timezone to UTC timestamp
 * Uses 1970-01-01 as reference date to store only the time component
 */
export function convertTimeStringToUTCTimestamp(
  timeString: string, // "09:00" format
  timezone: string,
): Date {
  const referenceDate = "1970-01-01";
  const dateTimeInTZ = DateTime.fromFormat(`${referenceDate} ${timeString}`, "yyyy-MM-dd HH:mm", {
    zone: timezone,
  });
  
  return dateTimeInTZ.toUTC().toJSDate();
}

/**
 * Convert UTC timestamp to time string in user's timezone
 * Extracts only the time component (HH:mm)
 */
export function convertUTCTimestampToTimeString(
  utcTimestamp: Date,
  timezone: string,
): string {
  const dateTimeInTZ = DateTime.fromJSDate(utcTimestamp).setZone(timezone);
  return dateTimeInTZ.toFormat("HH:mm");
}

/**
 * Get the time component only from a UTC timestamp
 * Useful for time inputs which expect HH:mm format
 */
export function getUTCTimeComponent(timestamp: Date): string {
  return DateTime.fromJSDate(timestamp).toUTC().toFormat("HH:mm");
}

/**
 * Convert time string to UTC timestamp for migration purposes
 * This function helps migrate existing time data to UTC timestamps
 */
export function convertTimeStringToUTCTimestampForMigration(
  timeString: string, // "09:00" format from existing time column
  userTimezone: string,
): Date {
  return convertTimeStringToUTCTimestamp(timeString, userTimezone);
}
