import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getBookingById } from "@/service/bookings";
import { getUserById } from "@/service/user";
import { notFound } from "@tanstack/react-router";

type BookingDetailsResponse = {
  id: string;
  organizerId: string;
  attendantName: string;
  attendantEmail: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
  organizer?: {
    id: string;
    username: string;
    email: string;
  };
  metadata?: any;
};

export const getBookingDetailsSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  includeOrganizerDetails: z.boolean().optional().default(false),
});

export const getBookingDetails = createServerFn({ method: "GET" })
  .inputValidator(getBookingDetailsSchema)
  .handler(async ({ data }): Promise<BookingDetailsResponse> => {
    const { bookingId, includeOrganizerDetails } = data;

    // Get booking by ID
    const booking = await getBookingById(bookingId);
    if (!booking) {
      throw notFound();
    }

    const result: BookingDetailsResponse = {
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
