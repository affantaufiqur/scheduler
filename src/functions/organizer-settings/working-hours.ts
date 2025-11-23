import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/middleware/auth";
import {
  getWorkingHoursByUserId,
  createWorkingHours,
  updateWorkingHours,
  deleteWorkingHours,
  bulkUpdateWorkingHours,
  setDefaultWorkingHours,
} from "@/service/working-hours";
import {
  workingHoursSchema,
  bulkWorkingHoursSchema,
  WorkingHoursData,
  BulkWorkingHoursData,
} from "./schema";

export const getWorkingHours = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id;

    try {
      const workingHours = await getWorkingHoursByUserId(userId);
      return workingHours;
    } catch (error) {
      throw new Error("Failed to fetch working hours");
    }
  });

export const createWorkingHoursFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: WorkingHoursData) => workingHoursSchema.parse(data))
  .handler(async ({ context, data }) => {
    const userId = context.user.id;

    try {
      const result = await createWorkingHours(userId, data);
      if (!result) {
        throw new Error("Failed to create working hours");
      }
      return result;
    } catch (error) {
      throw new Error("Failed to create working hours");
    }
  });

export const updateWorkingHoursFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: WorkingHoursData & { id: string }) =>
    workingHoursSchema.required({ id: true }).parse(data),
  )
  .handler(async ({ data }) => {
    const { id, ...updateData } = data;

    try {
      const result = await updateWorkingHours(id, updateData);
      if (!result) {
        throw new Error("Working hours not found or update failed");
      }
      return result;
    } catch (error) {
      throw new Error("Failed to update working hours");
    }
  });

export const deleteWorkingHoursFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    try {
      const success = await deleteWorkingHours(data.id);
      if (!success) {
        throw new Error("Working hours not found or deletion failed");
      }
      return { success: true };
    } catch (error) {
      throw new Error("Failed to delete working hours");
    }
  });

export const bulkUpdateWorkingHoursFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: BulkWorkingHoursData) => bulkWorkingHoursSchema.parse(data))
  .handler(async ({ context, data }) => {
    const userId = context.user.id;

    try {
      const results = await bulkUpdateWorkingHours(userId, data);
      return results;
    } catch (error) {
      throw new Error("Failed to bulk update working hours");
    }
  });

export const setDefaultWorkingHoursFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id;

    try {
      const results = await setDefaultWorkingHours(userId);
      return results;
    } catch (error) {
      throw new Error("Failed to set default working hours");
    }
  });
