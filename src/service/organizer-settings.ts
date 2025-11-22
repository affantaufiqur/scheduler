import db from "@/configs/db";
import { organizerSettingsTable } from "@/configs/db/schema/organizer-settings";
import { eq } from "drizzle-orm";
import { OrganizerSettings, NewOrganizerSettings } from "@/configs/db/schema/organizer-settings";

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

  const result = await db
    .update(organizerSettingsTable)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(organizerSettingsTable.userId, userId))
    .returning();

  return result[0] || null;
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
