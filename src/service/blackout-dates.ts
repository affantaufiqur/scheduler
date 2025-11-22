import db from "@/configs/db";
import { blackoutDatesTable } from "@/configs/db/schema/blackout-dates";
import { eq, and, isNull, gte, lte } from "drizzle-orm";
import { BlackoutDates, NewBlackoutDates } from "@/configs/db/schema/blackout-dates";

export async function createBlackoutDate(
  userId: string,
  blackoutDate: Omit<NewBlackoutDates, "id" | "userId" | "createdAt" | "updatedAt">,
): Promise<BlackoutDates | null> {
  const blackoutDateData: NewBlackoutDates = {
    userId,
    date: blackoutDate.date,
    reason: blackoutDate.reason,
  };

  const result = await db.insert(blackoutDatesTable).values(blackoutDateData).returning();

  return result[0] || null;
}

export async function getBlackoutDatesByUserId(userId: string): Promise<BlackoutDates[]> {
  const result = await db
    .select()
    .from(blackoutDatesTable)
    .where(and(eq(blackoutDatesTable.userId, userId), isNull(blackoutDatesTable.deletedAt)))
    .orderBy(blackoutDatesTable.date);

  return result;
}

export async function getBlackoutDatesByUserIdAndDateRange(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<BlackoutDates[]> {
  // Set end date to end of day to include the full date range
  const endDateWithTime = new Date(endDate);
  endDateWithTime.setHours(23, 59, 59, 999);

  const result = await db
    .select()
    .from(blackoutDatesTable)
    .where(
      and(
        eq(blackoutDatesTable.userId, userId),
        gte(blackoutDatesTable.date, startDate),
        lte(blackoutDatesTable.date, endDateWithTime),
        isNull(blackoutDatesTable.deletedAt),
      ),
    )
    .orderBy(blackoutDatesTable.date);

  return result;
}

export async function getBlackoutDateById(id: string): Promise<BlackoutDates | null> {
  const result = await db
    .select()
    .from(blackoutDatesTable)
    .where(and(eq(blackoutDatesTable.id, id), isNull(blackoutDatesTable.deletedAt)));

  return result[0] || null;
}

export async function getBlackoutDateByUserIdAndDate(
  userId: string,
  date: Date,
): Promise<BlackoutDates | null> {
  // Create date range for the entire day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const result = await db
    .select()
    .from(blackoutDatesTable)
    .where(
      and(
        eq(blackoutDatesTable.userId, userId),
        gte(blackoutDatesTable.date, startOfDay),
        lte(blackoutDatesTable.date, endOfDay),
        isNull(blackoutDatesTable.deletedAt),
      ),
    );

  return result[0] || null;
}

export async function updateBlackoutDateById(
  id: string,
  blackoutDate: Partial<Omit<NewBlackoutDates, "id" | "userId" | "createdAt" | "updatedAt">>,
): Promise<BlackoutDates | null> {
  if (!blackoutDate || Object.keys(blackoutDate).length === 0) {
    return null;
  }

  const result = await db
    .update(blackoutDatesTable)
    .set({
      ...blackoutDate,
      updatedAt: new Date(),
    })
    .where(eq(blackoutDatesTable.id, id))
    .returning();

  return result[0] || null;
}

export async function deleteBlackoutDate(id: string): Promise<boolean> {
  const result = await db
    .update(blackoutDatesTable)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(blackoutDatesTable.id, id));

  if (!result.rowCount) {
    return false;
  }

  return result.rowCount > 0;
}

export async function bulkUpsertBlackoutDates(
  userId: string,
  blackoutDatesArray: Array<
    Partial<Omit<NewBlackoutDates, "id" | "userId" | "createdAt" | "updatedAt">> & {
      id?: string;
      date: Date;
    }
  >,
): Promise<BlackoutDates[]> {
  if (!blackoutDatesArray || blackoutDatesArray.length === 0) {
    return [];
  }

  const results: BlackoutDates[] = [];

  for (const blackoutDate of blackoutDatesArray) {
    if (blackoutDate.id) {
      // Update existing
      const { id, ...updateData } = blackoutDate;
      const result = await updateBlackoutDateById(id, updateData);
      if (result) results.push(result);
    } else {
      // Check if date already exists for this user
      const existing = await getBlackoutDateByUserIdAndDate(userId, blackoutDate.date);
      if (existing) {
        // Update existing
        const result = await updateBlackoutDateById(existing.id, blackoutDate);
        if (result) results.push(result);
      } else {
        // Create new
        const result = await createBlackoutDate(userId, blackoutDate);
        if (result) results.push(result);
      }
    }
  }

  return results;
}

export async function isDateBlackouted(userId: string, date: Date): Promise<boolean> {
  const blackoutDate = await getBlackoutDateByUserIdAndDate(userId, date);
  return blackoutDate !== null;
}
