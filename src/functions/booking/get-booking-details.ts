import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getBookingById } from "@/service/bookings";
import { getUserById, getUserByUsername } from "@/service/user";
import { notFound } from "@tanstack/react-router";

export const getBookingDetailsSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  includeOrganizerDetails: z.boolean().optional().default(false),
});

export const getBookingDetails = createServerFn({ method: "GET" })
  .inputValidator(getBookingDetailsSchema)
  .handler(async ({ data }) => {
    const { bookingId, includeOrganizerDetails } = data;

    // Get booking by ID
    const booking = await getBookingById(bookingId);
    if (!booking) {
      throw notFound();
    }

    const result: any = {
      id: booking.id,
      organizerId: booking.organizerId,
      attendantName: booking.attendantName,
      attendantEmail: booking.attendantEmail,
      title: booking.title,
      description: booking.description,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };

    // Include organizer details if requested
    if (includeOrganizerDetails) {
      const organizerResult = await getUserById(booking.organizerId);
      if (organizerResult && organizerResult.length > 0) {
        const organizer = organizerResult[0];
        result.organizer = {
          id: organizer.id,
          username: organizer.username,
          email: organizer.email,
        };
      }
    }

    // Include metadata if present
    if (booking.metadata) {
      result.metadata = booking.metadata;
    }

    return result;
  });
