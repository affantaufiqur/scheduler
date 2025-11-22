import db from "@/configs/db";
import { workingHoursTable } from "@/configs/db/schema/working-hours";
import { eq, and, isNull } from "drizzle-orm";
import { WorkingHours, NewWorkingHours } from "@/configs/db/schema/working-hours";

export async function createWorkingHours(
  userId: string,
  workingHours: Omit<NewWorkingHours, "id" | "userId" | "createdAt" | "updatedAt">,
): Promise<WorkingHours | null> {
  const workingHoursData: NewWorkingHours = {
    userId,
    dayOfWeek: workingHours.dayOfWeek,
    startTime: workingHours.startTime,
    endTime: workingHours.endTime,
    isActive: workingHours.isActive ?? true,
  };

  const result = await db.insert(workingHoursTable).values(workingHoursData).returning();

  return result[0] || null;
}

export async function getWorkingHoursByUserId(userId: string): Promise<WorkingHours[]> {
  const result = await db
    .select()
    .from(workingHoursTable)
    .where(and(eq(workingHoursTable.userId, userId), isNull(workingHoursTable.deletedAt)))
    .orderBy(workingHoursTable.dayOfWeek);

  return result;
}

export async function getWorkingHoursByDay(userId: string, dayOfWeek: string): Promise<WorkingHours[]> {
  const result = await db
    .select()
    .from(workingHoursTable)
    .where(
      and(
        eq(workingHoursTable.userId, userId),
        eq(workingHoursTable.dayOfWeek, dayOfWeek),
        isNull(workingHoursTable.deletedAt)
      )
    )
    .orderBy(workingHoursTable.startTime);

  return result;
}

export async function updateWorkingHours(
  id: string,
  workingHours: Partial<Omit<NewWorkingHours, "id" | "userId" | "createdAt" | "updatedAt">>,
): Promise<WorkingHours | null> {
  if (!workingHours || Object.keys(workingHours).length === 0) {
    return null;
  }

  const result = await db
    .update(workingHoursTable)
    .set({
      ...workingHours,
      updatedAt: new Date(),
    })
    .where(eq(workingHoursTable.id, id))
    .returning();

  return result[0] || null;
}

export async function deleteWorkingHours(id: string): Promise<boolean> {
  const result = await db
    .update(workingHoursTable)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workingHoursTable.id, id));

  if (!result.rowCount) {
    return false;
  }

  return result.rowCount > 0;
}

export async function bulkUpdateWorkingHours(
  userId: string,
  workingHoursArray: Array<Partial<Omit<NewWorkingHours, "id" | "userId" | "createdAt" | "updatedAt">> & { id?: string; dayOfWeek: string; startTime: string; endTime: string }>,
): Promise<WorkingHours[]> {
  if (!workingHoursArray || workingHoursArray.length === 0) {
    return [];
  }

  const results: WorkingHours[] = [];

  for (const workingHours of workingHoursArray) {
    if (workingHours.id) {
      // Update existing
      const { id, ...updateData } = workingHours;
      const result = await updateWorkingHours(id, updateData);
      if (result) results.push(result);
    } else {
      // Create new
      const result = await createWorkingHours(userId, workingHours);
      if (result) results.push(result);
    }
  }

  return results;
}

export async function setDefaultWorkingHours(userId: string): Promise<WorkingHours[]> {
  const defaultSchedule = [
    { dayOfWeek: "1", startTime: "09:00", endTime: "17:00", isActive: true }, // Monday
    { dayOfWeek: "2", startTime: "09:00", endTime: "17:00", isActive: true }, // Tuesday
    { dayOfWeek: "3", startTime: "09:00", endTime: "17:00", isActive: true }, // Wednesday
    { dayOfWeek: "4", startTime: "09:00", endTime: "17:00", isActive: true }, // Thursday
    { dayOfWeek: "5", startTime: "09:00", endTime: "17:00", isActive: true }, // Friday
  ];

  const results: WorkingHours[] = [];

  for (const schedule of defaultSchedule) {
    const result = await createWorkingHours(userId, schedule);
    if (result) results.push(result);
  }

  return results;
}
