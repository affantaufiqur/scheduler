import db from "@/configs/db";
import { bookingsTable } from "@/configs/db/schema/bookings";
import { eq, and, isNull, gte, lte } from "drizzle-orm";
import { Booking, NewBooking } from "@/configs/db/schema/bookings";

export async function createBooking(
  booking: Omit<NewBooking, "id" | "createdAt" | "updatedAt">
): Promise<Booking | null> {
  const bookingData: NewBooking = {
    ...booking,
  };

  const result = await db.insert(bookingsTable).values(bookingData).returning();

  return result[0] || null;
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const result = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.id, id), isNull(bookingsTable.deletedAt)));

  return result[0] || null;
}

export async function getBookingsByOrganizerId(organizerId: string): Promise<Booking[]> {
  const result = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.organizerId, organizerId), isNull(bookingsTable.deletedAt)))
    .orderBy(bookingsTable.startTime);

  return result;
}

export async function getBookingsByOrganizerInDateRange(
  organizerId: string,
  startDateUTC: Date,
  endDateUTC: Date
): Promise<Booking[]> {
  // Set end date to end of day to include the full date range
  const endDateWithTime = new Date(endDateUTC);
  endDateWithTime.setHours(23, 59, 59, 999);

  const result = await db
    .select()
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.organizerId, organizerId),
        gte(bookingsTable.startTime, startDateUTC),
        lte(bookingsTable.startTime, endDateWithTime),
        isNull(bookingsTable.deletedAt),
      ),
    )
    .orderBy(bookingsTable.startTime);

  return result;
}

export async function updateBooking(
  id: string,
  booking: Partial<Omit<NewBooking, "id" | "createdAt" | "updatedAt">>
): Promise<Booking | null> {
  if (!booking || Object.keys(booking).length === 0) {
    return null;
  }

  const result = await db
    .update(bookingsTable)
    .set({
      ...booking,
      updatedAt: new Date(),
    })
    .where(eq(bookingsTable.id, id))
    .returning();

  return result[0] || null;
}

export async function deleteBooking(id: string): Promise<boolean> {
  const result = await db
    .update(bookingsTable)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(bookingsTable.id, id));

  if (!result.rowCount) {
    return false;
  }

  return result.rowCount > 0;
}

export async function getBookingsByAttendantEmail(attendantEmail: string): Promise<Booking[]> {
  const result = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.attendantEmail, attendantEmail), isNull(bookingsTable.deletedAt)))
    .orderBy(bookingsTable.startTime);

  return result;
}
