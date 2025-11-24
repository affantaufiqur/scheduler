import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/middleware/auth";
import {
  createBlackoutDate,
  getBlackoutDatesByUserId,
  updateBlackoutDateById,
  deleteBlackoutDate,
  bulkUpsertBlackoutDates,
  getBlackoutDatesByUserIdAndDateRange,
} from "@/service/blackout-dates";
import { getOrganizerSettings } from "@/service/organizer-settings";
import { DateTime } from "luxon";

// Schema for creating/updating a single blackout date
// Note: Date transformation happens in the handler where we have access to user's timezone
const blackoutDateSchema = z.object({
  id: z.string().optional(),
  date: z.string(), // Keep as string, transform in handler with timezone context
  reason: z.string().optional(),
});

// Schema for bulk operations
const bulkBlackoutDatesSchema = z.array(blackoutDateSchema);

// Schema for date range queries
const dateRangeSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

// Get all blackout dates for a user
export const getBlackoutDates = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id;

    // Get user's timezone settings
    const settings = await getOrganizerSettings(userId);
    if (!settings) {
      throw new Error("User settings not found");
    }

    const blackoutDates = await getBlackoutDatesByUserId(userId);

    // Convert UTC timestamps back to organizer's timezone for display
    return blackoutDates.map((date) => ({
      id: date.id,
      date: DateTime.fromJSDate(date.date).setZone(settings.workingTimezone).toFormat("yyyy-MM-dd"), // Format as YYYY-MM-DD in organizer's timezone
      reason: date.reason,
      createdAt: date.createdAt,
      updatedAt: date.updatedAt,
    }));
  });

// Get blackout dates within a date range
export const getBlackoutDatesInRange = createServerFn({ method: "POST" })
  .inputValidator(dateRangeSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.user.id;

    // Get user's timezone settings
    const settings = await getOrganizerSettings(userId);
    if (!settings) {
      throw new Error("User settings not found");
    }

    // Convert date strings to UTC Date objects using organizer's timezone
    const startDate = DateTime.fromISO(data.startDate, { zone: settings.workingTimezone })
      .startOf("day")
      .toUTC()
      .toJSDate();

    const endDate = DateTime.fromISO(data.endDate, { zone: settings.workingTimezone })
      .endOf("day")
      .toUTC()
      .toJSDate();

    const blackoutDates = await getBlackoutDatesByUserIdAndDateRange(userId, startDate, endDate);

    // Convert UTC timestamps back to organizer's timezone for display
    return blackoutDates.map((date) => ({
      id: date.id,
      date: DateTime.fromJSDate(date.date).setZone(settings.workingTimezone).toFormat("yyyy-MM-dd"), // Format as YYYY-MM-DD in organizer's timezone
      reason: date.reason,
      createdAt: date.createdAt,
      updatedAt: date.updatedAt,
    }));
  });

// Create a new blackout date
export const createBlackoutDateFn = createServerFn({ method: "POST" })
  .inputValidator(blackoutDateSchema.omit({ id: true }))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.user.id;

    // Get user's timezone settings
    const settings = await getOrganizerSettings(userId);
    if (!settings) {
      throw new Error("User settings not found");
    }

    // Convert date string to UTC using organizer's timezone
    const dateInTZ = DateTime.fromISO(data.date, { zone: settings.workingTimezone })
      .startOf("day")
      .toUTC()
      .toJSDate();

    const blackoutDate = await createBlackoutDate(userId, {
      date: dateInTZ,
      reason: data.reason,
    });

    if (!blackoutDate) {
      throw new Error("Failed to create blackout date");
    }

    // Convert back to organizer's timezone for display
    return {
      id: blackoutDate.id,
      date: DateTime.fromJSDate(blackoutDate.date)
        .setZone(settings.workingTimezone)
        .toFormat("yyyy-MM-dd"),
      reason: blackoutDate.reason,
      createdAt: blackoutDate.createdAt,
      updatedAt: blackoutDate.updatedAt,
    };
  });

// Update an existing blackout date
export const updateBlackoutDateFn = createServerFn()
  .inputValidator(blackoutDateSchema.partial().required({ id: true }))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const { id, ...updateData } = data;

    // Get user's timezone settings
    const settings = await getOrganizerSettings(userId);
    if (!settings) {
      throw new Error("User settings not found");
    }

    // Convert date string to UTC if provided
    const dataToUpdate: { date?: Date; reason?: string } = {};
    if (updateData.date) {
      dataToUpdate.date = DateTime.fromISO(updateData.date, { zone: settings.workingTimezone })
        .startOf("day")
        .toUTC()
        .toJSDate();
    }
    if (updateData.reason !== undefined) {
      dataToUpdate.reason = updateData.reason;
    }

    const blackoutDate = await updateBlackoutDateById(id, dataToUpdate);

    if (!blackoutDate) {
      throw new Error("Failed to update blackout date or date not found");
    }

    // Convert back to organizer's timezone for display
    return {
      id: blackoutDate.id,
      date: DateTime.fromJSDate(blackoutDate.date)
        .setZone(settings.workingTimezone)
        .toFormat("yyyy-MM-dd"),
      reason: blackoutDate.reason,
      createdAt: blackoutDate.createdAt,
      updatedAt: blackoutDate.updatedAt,
    };
  });

// Delete a blackout date
export const deleteBlackoutDateFn = createServerFn()
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const success = await deleteBlackoutDate(data.id);

    if (!success) {
      throw new Error("Failed to delete blackout date or date not found");
    }

    return { success: true };
  });

// Bulk create/update blackout dates
export const bulkUpsertBlackoutDatesFn = createServerFn({ method: "POST" })
  .inputValidator(bulkBlackoutDatesSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.user.id;

    // Get user's timezone settings
    const settings = await getOrganizerSettings(userId);
    if (!settings) {
      throw new Error("User settings not found");
    }

    // Convert all date strings to UTC using organizer's timezone
    const datesWithUTC = data.map((item) => ({
      ...item,
      date: DateTime.fromISO(item.date, { zone: settings.workingTimezone })
        .startOf("day")
        .toUTC()
        .toJSDate(),
    }));

    const blackoutDates = await bulkUpsertBlackoutDates(userId, datesWithUTC);

    // Convert back to organizer's timezone for display
    return blackoutDates.map((date) => ({
      id: date.id,
      date: DateTime.fromJSDate(date.date).setZone(settings.workingTimezone).toFormat("yyyy-MM-dd"),
      reason: date.reason,
      createdAt: date.createdAt,
      updatedAt: date.updatedAt,
    }));
  });
