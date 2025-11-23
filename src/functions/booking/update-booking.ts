import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getBookingById, updateBooking as updateBookingService } from "@/service/bookings";

export const updateBookingSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  title: z.string().min(1, "Meeting title is required").optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const updateBooking = createServerFn({ method: "POST" })
  .inputValidator(updateBookingSchema)
  .handler(async ({ data }) => {
    const { bookingId, title, description, metadata } = data;

    // Get existing booking
    const existingBooking = await getBookingById(bookingId);
    if (!existingBooking) {
      throw new Error("Booking not found");
    }

    // Check if booking is in the past
    if (new Date(existingBooking.startTime) < new Date()) {
      throw new Error("Cannot update past bookings");
    }

    // Build update object
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (metadata !== undefined) updates.metadata = metadata;

    // No updates provided
    if (Object.keys(updates).length === 0) {
      throw new Error("No updates provided");
    }

    // Update the booking
    const updatedBooking = await updateBookingService(bookingId, updates);
    if (!updatedBooking) {
      throw new Error("Failed to update booking");
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
  });
