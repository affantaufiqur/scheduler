import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getUserByUsername } from "@/service/user";
import { createBooking as createBookingService } from "@/service/bookings";
import { getOrganizerSettings } from "@/service/organizer-settings";
import { calculateAvailableSlots } from "@/service/availability";
import redis from "@/configs/db/redis";
import { DateTime } from "luxon";

export const createBookingSchema = z.object({
  organizerUsername: z.string().min(3, "Username must be at least 3 characters"),
  attendantName: z.string().min(1, "Attendant name is required"),
  attendantEmail: z.email("Invalid email address"),
  title: z.string().min(1, "Meeting title is required"),
  description: z.string().optional(),
  startTime: z.iso.datetime(), // ISO datetime string
  endTime: z.iso.datetime(), // ISO datetime string
  metadata: z.record(z.string(), z.any()).optional(), // For additional attendees or metadata
});

const LOCK_EXPIRY = 100000; // 10 seconds in milliseconds
const LOCK_PREFIX = "lock:booking";

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator(createBookingSchema)
  .handler(async ({ data }) => {
    const {
      organizerUsername,
      attendantName,
      attendantEmail,
      title,
      description,
      startTime: startTimeStr,
      endTime: endTimeStr,
      metadata,
    } = data;

    // Parse dates
    const startTime = new Date(startTimeStr);
    const endTime = new Date(endTimeStr);

    // Validate time range
    if (startTime >= endTime) {
      return { error: "End time must be after start time" };
    }

    // Get organizer by username
    const organizerResult = await getUserByUsername(organizerUsername);
    if (!organizerResult || organizerResult.length === 0) {
      return { error: "Organizer not found" };
    }

    const organizerId = organizerResult[0].id;

    // Get organizer settings for buffer times
    const settings = await getOrganizerSettings(organizerId);
    if (!settings) {
      return { error: "Organizer settings not found" };
    }

    // Create a unique lock key for this time slot
    const startTimestamp = DateTime.fromJSDate(startTime).toMillis();
    const lockKey = `${LOCK_PREFIX}:${organizerId}:${startTimestamp}`;

    // Acquire Redis lock with NX (only if not exists) and PX (milliseconds expiry)
    const lockAcquired = await redis.set(lockKey, "locked", {
      NX: true,
      PX: LOCK_EXPIRY,
    });

    if (!lockAcquired) {
      return {
        error: "This time slot is currently being booked by another user. Please try again.",
      };
    }

    try {
      // Double-check availability by recalculating slots
      const { slots } = await calculateAvailableSlots(organizerId);

      // Check if the requested slot is still available
      const isSlotAvailable = slots.some((slot) => {
        const slotStart = new Date(slot.startTime);
        const slotEnd = new Date(slot.endTime);
        return (
          slotStart.getTime() === startTime.getTime() && slotEnd.getTime() === endTime.getTime()
        );
      });

      if (!isSlotAvailable) {
        return { error: "This time slot is no longer available" };
      }

      // Create the booking
      const newBooking = await createBookingService({
        organizerId,
        attendantName,
        attendantEmail,
        title: title,
        description: description || null,
        startTime,
        endTime,
        metadata: metadata || null,
      });

      if (!newBooking) {
        return { error: "Failed to create booking" };
      }

      return {
        success: true,
        booking: {
          id: newBooking.id,
          organizerId: newBooking.organizerId,
          attendantName: newBooking.attendantName,
          attendantEmail: newBooking.attendantEmail,
          title: newBooking.title,
          description: newBooking.description,
          startTime: newBooking.startTime.toISOString(),
          endTime: newBooking.endTime.toISOString(),
          createdAt: newBooking.createdAt.toISOString(),
        },
      };
    } finally {
      // Always release the lock
      await redis.del(lockKey);
    }
  });
