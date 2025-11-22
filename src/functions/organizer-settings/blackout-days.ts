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

// Schema for creating/updating a single blackout date
const blackoutDateSchema = z.object({
  id: z.string().optional(),
  date: z.string().transform((val) => new Date(val)), // Transform string to Date
  reason: z.string().optional(),
});

// Schema for bulk operations
const bulkBlackoutDatesSchema = z.array(blackoutDateSchema);

// Schema for date range queries
const dateRangeSchema = z.object({
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
});

// Get all blackout dates for a user
export const getBlackoutDates = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    const blackoutDates = await getBlackoutDatesByUserId(userId);

    return blackoutDates.map((date) => ({
      id: date.id,
      date: date.date.toISOString().split("T")[0], // Format as YYYY-MM-DD
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
    const blackoutDates = await getBlackoutDatesByUserIdAndDateRange(
      userId,
      data.startDate,
      data.endDate,
    );

    return blackoutDates.map((date) => ({
      id: date.id,
      date: date.date.toISOString().split("T")[0], // Format as YYYY-MM-DD
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
    const blackoutDate = await createBlackoutDate(userId, data);

    if (!blackoutDate) {
      throw new Error("Failed to create blackout date");
    }

    return {
      id: blackoutDate.id,
      date: blackoutDate.date.toISOString().split("T")[0],
      reason: blackoutDate.reason,
      createdAt: blackoutDate.createdAt,
      updatedAt: blackoutDate.updatedAt,
    };
  });

// Update an existing blackout date
export const updateBlackoutDateFn = createServerFn()
  .inputValidator(blackoutDateSchema.partial().required({ id: true }))
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const { id, ...updateData } = data;
    const blackoutDate = await updateBlackoutDateById(id, updateData);

    if (!blackoutDate) {
      throw new Error("Failed to update blackout date or date not found");
    }

    return {
      id: blackoutDate.id,
      date: blackoutDate.date.toISOString().split("T")[0],
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
    const blackoutDates = await bulkUpsertBlackoutDates(userId, data);

    return blackoutDates.map((date) => ({
      id: date.id,
      date: date.date.toISOString().split("T")[0],
      reason: date.reason,
      createdAt: date.createdAt,
      updatedAt: date.updatedAt,
    }));
  });
