import db from "@/configs/db";
import { organizerSettingsTable } from "@/configs/db/schema/organizer-settings";
import { workingHoursTable } from "@/configs/db/schema/working-hours";
import { eq, and, isNull } from "drizzle-orm";
import { OrganizerSettings, NewOrganizerSettings } from "@/configs/db/schema/organizer-settings";
import { WorkingHours } from "@/configs/db/schema/working-hours";
import { convertTimeStringToUTCTimestamp, convertUTCTimestampToTimeString } from "@/helpers/timezone";
import { DateTime } from "luxon";

export async function createOrganizerSettings(
  userId: string,
  settings: Partial<NewOrganizerSettings> = {},
): Promise<OrganizerSettings | null> {
  const settingsData: NewOrganizerSettings = {
    userId,
    defaultMeetingDuration: settings.defaultMeetingDuration || 30,
    preBookingBuffer: settings.preBookingBuffer ?? 0,
    postBookingBuffer: settings.postBookingBuffer ?? 0,
    minBookingNotice: settings.minBookingNotice || 2,
    maxBookingAdvance: settings.maxBookingAdvance || 14,
    workingTimezone: settings.workingTimezone || "UTC",
  };

  const result = await db.insert(organizerSettingsTable).values(settingsData).returning();

  return result[0] || null;
}

export async function getOrganizerSettings(userId: string): Promise<OrganizerSettings | null> {
  const result = await db
    .select()
    .from(organizerSettingsTable)
    .where(eq(organizerSettingsTable.userId, userId))
    .limit(1);

  return result[0] || null;
}

export async function updateOrganizerSettings(
  userId: string,
  settings: Partial<NewOrganizerSettings>,
): Promise<OrganizerSettings | null> {
  if (!settings || Object.keys(settings).length === 0) {
    return null;
  }

  // Remove userId from settings if present to prevent updating it
  const { userId: _, ...updateData } = settings;

  // Check if timezone is being updated
  const isTimezoneUpdated = settings.workingTimezone;

  // Get current settings before update
  const currentSettings = await getOrganizerSettings(userId);
  if (!currentSettings) {
    throw new Error("Organizer settings not found");
  }

  const result = await db
    .update(organizerSettingsTable)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(organizerSettingsTable.userId, userId))
    .returning();

  const updatedSettings = result[0] || null;

  // If timezone was updated, convert all working hours to the new timezone
  if (isTimezoneUpdated && updatedSettings) {
    await convertWorkingHoursToNewTimezone(userId, currentSettings.workingTimezone, settings.workingTimezone!);
  }

  return updatedSettings;
}

/**
 * Convert all working hours from one timezone to another
 * This maintains the same local time representation but updates the underlying UTC storage
 */
async function convertWorkingHoursToNewTimezone(
  userId: string,
  oldTimezone: string,
  newTimezone: string,
): Promise<void> {
  // Get all working hours for the user
  const workingHours = await db
    .select()
    .from(workingHoursTable)
    .where(and(eq(workingHoursTable.userId, userId), isNull(workingHoursTable.deletedAt)));

  // Convert each working hour to the new timezone
  for (const wh of workingHours) {
    // Convert current UTC timestamp to local time in old timezone
    const currentStartTimeLocal = convertUTCTimestampToTimeString(wh.startTimeUtc, oldTimezone);
    const currentEndTimeLocal = convertUTCTimestampToTimeString(wh.endTimeUtc, oldTimezone);

    // Convert the same local times to UTC timestamps in the new timezone
    const newStartTimeUTC = convertTimeStringToUTCTimestamp(currentStartTimeLocal, newTimezone);
    const newEndTimeUTC = convertTimeStringToUTCTimestamp(currentEndTimeLocal, newTimezone);

    // Update the database record with new UTC timestamps
    await db
      .update(workingHoursTable)
      .set({
        startTimeUtc: newStartTimeUTC,
        endTimeUtc: newEndTimeUTC,
        updatedAt: new Date(),
      })
      .where(eq(workingHoursTable.id, wh.id));
  }
}

export async function deleteOrganizerSettings(userId: string): Promise<boolean> {
  const result = await db
    .update(organizerSettingsTable)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(organizerSettingsTable.userId, userId));

  if (!result.rowCount) {
    return false;
  }

  return result.rowCount > 0;
}
