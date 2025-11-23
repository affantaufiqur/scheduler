import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getBookingById, updateBooking as updateBookingService } from "@/service/bookings";
import { getOrganizerSettings } from "@/service/organizer-settings";
import { calculateAvailableSlots } from "@/service/availability";
import redis from "@/configs/db/redis";
import { DateTime } from "luxon";

export const rescheduleBookingSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  startTime: z.iso.datetime(), // ISO datetime string
  endTime: z.iso.datetime(), // ISO datetime string
});

const LOCK_EXPIRY = 10000; // 10 seconds in milliseconds
const LOCK_PREFIX = "lock:booking";

export const rescheduleBooking = createServerFn({ method: "POST" })
  .inputValidator(rescheduleBookingSchema)
  .handler(async ({ data }) => {
    const { bookingId, startTime: startTimeStr, endTime: endTimeStr } = data;

    // Get existing booking
    const existingBooking = await getBookingById(bookingId);
    if (!existingBooking) {
      throw new Error("Booking not found");
    }

    // Check if booking is in the past
    if (new Date(existingBooking.startTime) < new Date()) {
      throw new Error("Cannot reschedule past bookings");
    }

    const newStartTime = new Date(startTimeStr);
    const newEndTime = new Date(endTimeStr);

    // Validate time range
    if (newStartTime >= newEndTime) {
      throw new Error("End time must be after start time");
    }

    // Validate new time is in the future
    if (newStartTime < new Date()) {
      throw new Error("Cannot reschedule to a past time");
    }

    // Get organizer settings
    const settings = await getOrganizerSettings(existingBooking.organizerId);
    if (!settings) {
      throw new Error("Organizer settings not found");
    }

    // Create a unique lock key for the NEW time slot
    const newStartTimestamp = DateTime.fromJSDate(newStartTime).toMillis();
    const lockKey = `${LOCK_PREFIX}:${existingBooking.organizerId}:${newStartTimestamp}`;

    // Acquire Redis lock for the new slot
    const lockAcquired = await redis.set(lockKey, "locked", {
      NX: true,
      PX: LOCK_EXPIRY,
    });

    if (!lockAcquired) {
      throw new Error("This time slot is currently being booked. Please try again.");
    }

    try {
      // Double-check availability by recalculating slots
      const { slots } = await calculateAvailableSlots(existingBooking.organizerId);

      // Check if the NEW slot is available
      const isSlotAvailable = slots.some((slot) => {
        const slotStart = new Date(slot.startTime);
        const slotEnd = new Date(slot.endTime);
        return (
          slotStart.getTime() === newStartTime.getTime() &&
          slotEnd.getTime() === newEndTime.getTime()
        );
      });

      if (!isSlotAvailable) {
        throw new Error("This time slot is no longer available");
      }

      // Update only the time
      const updates = {
        startTime: newStartTime,
        endTime: newEndTime,
      };

      // Update the booking
      const updatedBooking = await updateBookingService(bookingId, updates);
      if (!updatedBooking) {
        throw new Error("Failed to reschedule booking");
      }

      return {
        success: true,
        booking: {
          id: updatedBooking.id,
          organizerId: updatedBooking.organizerId,
          attendantName: updatedBooking.attendantName,
          attendantEmail: updatedBooking.attendantEmail,
          title: updatedBooking.title,
          description: updatedBooking.description,
          startTime: updatedBooking.startTime.toISOString(),
          endTime: updatedBooking.endTime.toISOString(),
          updatedAt: updatedBooking.updatedAt.toISOString(),
        },
      };
    } finally {
      // Always release the lock
      await redis.del(lockKey);
    }
  });
