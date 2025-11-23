import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getBookingById, deleteBooking } from "@/service/bookings";
import { getUserById, getUserByUsername } from "@/service/user";
import { notFound } from "@tanstack/react-router";

export const cancelBookingSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  requestingUsername: z.string().optional(), // Optional username for permission check
});

export const cancelBooking = createServerFn({ method: "POST" })
  .inputValidator(cancelBookingSchema)
  .handler(async ({ data }) => {
    const { bookingId, requestingUsername } = data;

    // Get booking by ID
    const booking = await getBookingById(bookingId);
    if (!booking) {
      throw notFound();
    }

    // If a requesting username is provided, verify permissions
    if (requestingUsername) {
      // Get requesting user
      const requestingUserResult = await getUserByUsername(requestingUsername);
      if (!requestingUserResult || requestingUserResult.length === 0) {
        return { error: "Requesting user not found" };
      }

      const requestingUserId = requestingUserResult[0].id;

      // Check if user is either the organizer or the attendant
      const isOrganizer = requestingUserId === booking.organizerId;
      const isAttendant = requestingUserResult[0].email === booking.attendantEmail;

      if (!isOrganizer && !isAttendant) {
        return { error: "You don't have permission to cancel this booking" };
      }
    }

    // Cancel the booking (soft delete)
    const success = await deleteBooking(bookingId);

    if (!success) {
      return { error: "Failed to cancel booking" };
    }

    return {
      success: true,
      message: "Booking cancelled successfully",
      cancelledAt: new Date().toISOString(),
    };
  });
