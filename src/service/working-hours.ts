import db from "@/configs/db";
import { workingHoursTable } from "@/configs/db/schema/working-hours";
import { eq, and, isNull } from "drizzle-orm";
import { WorkingHours, NewWorkingHours } from "@/configs/db/schema/working-hours";
import {
  convertTimeStringToUTCTimestamp,
  convertUTCTimestampToTimeString,
} from "@/helpers/timezone";
import { getOrganizerSettings } from "./organizer-settings";

export async function createWorkingHours(
  userId: string,
  workingHours: {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    isActive?: boolean;
    deletedAt?: Date | null;
  },
): Promise<WorkingHours | null> {
  // Get user's timezone settings
  const settings = await getOrganizerSettings(userId);
  if (!settings) {
    throw new Error("User timezone settings not found");
  }

  // Convert time strings to UTC timestamps
  const startTimeUTC = convertTimeStringToUTCTimestamp(
    workingHours.startTime as string,
    settings.workingTimezone,
  );
  const endTimeUTC = convertTimeStringToUTCTimestamp(
    workingHours.endTime as string,
    settings.workingTimezone,
  );

  const workingHoursData: NewWorkingHours = {
    userId,
    dayOfWeek: workingHours.dayOfWeek,
    startTime: workingHours.startTime, // Keep original time format
    endTime: workingHours.endTime, // Keep original time format
    startTimeUtc: startTimeUTC, // Add UTC timestamp
    endTimeUtc: endTimeUTC, // Add UTC timestamp
    isActive: workingHours.isActive ?? true,
  };

  const result = await db.insert(workingHoursTable).values(workingHoursData).returning();

  return result[0] || null;
}

export async function getWorkingHoursByUserId(userId: string): Promise<WorkingHours[]> {
  const result = await db
    .select()
    .from(workingHoursTable)
    .where(and(eq(workingHoursTable.userId, userId), isNull(workingHoursTable.deletedAt)))
    .orderBy(workingHoursTable.dayOfWeek);

  return result;
}

/**
 * Get working hours with time components converted to user's timezone
 * This should be used for UI display purposes
 */
export async function getWorkingHoursByUserIdWithTimezone(
  userId: string,
): Promise<Array<WorkingHours & { startTimeLocal: string; endTimeLocal: string }>> {
  // Get raw working hours from database
  const workingHours = await getWorkingHoursByUserId(userId);

  // Get user's timezone settings
  const settings = await getOrganizerSettings(userId);
  if (!settings) {
    throw new Error("User timezone settings not found");
  }

  // Convert UTC timestamps to local time strings for UI
  return workingHours.map((wh) => ({
    ...wh,
    startTimeLocal: convertUTCTimestampToTimeString(wh.startTimeUtc, settings.workingTimezone),
    endTimeLocal: convertUTCTimestampToTimeString(wh.endTimeUtc, settings.workingTimezone),
  }));
}

export async function getWorkingHoursByDay(
  userId: string,
  dayOfWeek: string,
): Promise<WorkingHours[]> {
  const result = await db
    .select()
    .from(workingHoursTable)
    .where(
      and(
        eq(workingHoursTable.userId, userId),
        eq(workingHoursTable.dayOfWeek, dayOfWeek),
        isNull(workingHoursTable.deletedAt),
      ),
    )
    .orderBy(workingHoursTable.startTime);

  return result;
}

export async function updateWorkingHours(
  id: string,
  workingHours: Partial<{
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    startTimeUtc: Date;
    endTimeUtc: Date;
    isActive: boolean;
    deletedAt: Date | null;
  }>,
): Promise<WorkingHours | null> {
  if (!workingHours || Object.keys(workingHours).length === 0) {
    return null;
  }

  const result = await db
    .update(workingHoursTable)
    .set({
      ...workingHours,
      updatedAt: new Date(),
    })
    .where(eq(workingHoursTable.id, id))
    .returning();

  return result[0] || null;
}

export async function deleteWorkingHours(id: string): Promise<boolean> {
  const result = await db
    .update(workingHoursTable)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workingHoursTable.id, id));

  if (!result.rowCount) {
    return false;
  }

  return result.rowCount > 0;
}

export async function bulkUpdateWorkingHours(
  userId: string,
  workingHoursArray: Array<{
    id?: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    isActive?: boolean;
  }>,
): Promise<WorkingHours[]> {
  if (!workingHoursArray || workingHoursArray.length === 0) {
    return [];
  }

  // Get user's timezone settings once
  const settings = await getOrganizerSettings(userId);
  if (!settings) {
    throw new Error("User timezone settings not found");
  }

  const results: WorkingHours[] = [];

  for (const workingHours of workingHoursArray) {
    if (workingHours.id) {
      // Update existing
      const { id, ...updateData } = workingHours;

      // Convert time strings to UTC timestamps for updates
      const startTimeUTC = updateData.startTime
        ? convertTimeStringToUTCTimestamp(updateData.startTime as string, settings.workingTimezone)
        : undefined;
      const endTimeUTC = updateData.endTime
        ? convertTimeStringToUTCTimestamp(updateData.endTime as string, settings.workingTimezone)
        : undefined;

      const completeUpdateData = {
        ...updateData,
        ...(startTimeUTC && { startTimeUtc: startTimeUTC }),
        ...(endTimeUTC && { endTimeUtc: endTimeUTC }),
      };

      const result = await updateWorkingHours(id, completeUpdateData);
      if (result) results.push(result);
    } else {
      // Create new
      const result = await createWorkingHours(userId, workingHours);
      if (result) results.push(result);
    }
  }

  return results;
}

export async function setDefaultWorkingHours(userId: string): Promise<WorkingHours[]> {
  // Get user's timezone settings
  const settings = await getOrganizerSettings(userId);
  if (!settings) {
    throw new Error("User timezone settings not found");
  }

  const defaultSchedule = [
    { dayOfWeek: "1", startTime: "09:00", endTime: "17:00", isActive: true }, // Monday
    { dayOfWeek: "2", startTime: "09:00", endTime: "17:00", isActive: true }, // Tuesday
    { dayOfWeek: "3", startTime: "09:00", endTime: "17:00", isActive: true }, // Wednesday
    { dayOfWeek: "4", startTime: "09:00", endTime: "17:00", isActive: true }, // Thursday
    { dayOfWeek: "5", startTime: "09:00", endTime: "17:00", isActive: true }, // Friday
  ];

  const results: WorkingHours[] = [];

  for (const schedule of defaultSchedule) {
    // Create entries using the createWorkingHours function which handles timezone conversion
    const result = await createWorkingHours(userId, {
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      isActive: schedule.isActive,
    });
    if (result) results.push(result);
  }

  return results;
}
