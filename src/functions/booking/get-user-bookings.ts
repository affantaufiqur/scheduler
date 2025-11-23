import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getBookingsByOrganizerId, getBookingsByOrganizerInDateRange } from "@/service/bookings";
import { authMiddleware } from "@/middleware/auth";
import { DateTime } from "luxon";
import { getOrganizerSettings } from "@/service/organizer-settings";

export const getUserBookingsSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const getUserBookings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(getUserBookingsSchema)
  .handler(async ({ data, context }) => {
    const { page, limit, startDate, endDate } = data;
    const user = context.user;

    if (!user) {
      throw new Error("User not authenticated");
    }

    let bookings;

    if (startDate && endDate) {
      const startUTC = DateTime.fromISO(startDate, { zone: "utc" }).toUTC();
      const endUTC = DateTime.fromISO(endDate, { zone: "utc" }).toUTC();

      if (!startUTC.isValid || !endUTC.isValid) {
        throw new Error("Invalid date range provided");
      }

      bookings = await getBookingsByOrganizerInDateRange(
        user.id,
        startUTC.toJSDate(),
        endUTC.toJSDate(),
      );
    } else {
      bookings = await getBookingsByOrganizerId(user.id);
    }

    const offset = (page - 1) * limit;
    const paginatedBookings = bookings.slice(offset, offset + limit);

    return {
      bookings: paginatedBookings.map((booking) => ({
        id: booking.id,
        attendantName: booking.attendantName,
        attendantEmail: booking.attendantEmail,
        title: booking.title,
        description: booking.description,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total: bookings.length,
        totalPages: Math.ceil(bookings.length / limit),
      },
    };
  });

export const getTodayBookings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const user = context.user;

    if (!user) {
      throw new Error("User not authenticated");
    }

    // bookings will always be in UTC in the database
    const today = DateTime.utc();

    // Get start and end of today in UTC
    // But we need to consider user's timezone from their settings
    // So we should get user's organizer settings first
    // Then convert start and end of day to user's timezone
    const userSettings = await getOrganizerSettings(user.id);
    if (!userSettings) {
      throw new Error("User settings not found");
    }

    const startOfDay = today.setZone(userSettings.workingTimezone).startOf("day").toUTC();
    const endOfDay = today.setZone(userSettings.workingTimezone).endOf("day").toUTC();

    const bookings = await getBookingsByOrganizerInDateRange(
      user.id,
      startOfDay.toJSDate(),
      endOfDay.toJSDate(),
    );

    return {
      bookings: bookings.map((booking) => ({
        id: booking.id,
        attendantName: booking.attendantName,
        attendantEmail: booking.attendantEmail,
        title: booking.title,
        description: booking.description,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
      })),
    };
  });
