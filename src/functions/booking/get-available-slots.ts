import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getUserByUsername } from "@/service/user";
import { calculateAvailableSlots } from "@/service/availability";
import { notFound } from "@tanstack/react-router";

export const getAvailableSlotsByUsernameSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  startDate: z.iso.datetime().optional(), // ISO date string
  endDate: z.iso.datetime().optional(), // ISO date string
});

export const getAvailableSlotsByUsername = createServerFn({ method: "GET" })
  .inputValidator(getAvailableSlotsByUsernameSchema)
  .handler(async ({ data }) => {
    const { username, startDate, endDate } = data;

    // Get user by username
    const userResult = await getUserByUsername(username);
    if (!userResult || userResult.length === 0) {
      throw notFound();
    }

    const userId = userResult[0].id;

    // Calculate available slots for the user
    const userSlots = await calculateAvailableSlots(userId);

    // Filter by date range if provided
    let filteredSlots = userSlots.slots;
    if (startDate || endDate) {
      filteredSlots = filteredSlots.filter((slot) => {
        const slotStart = new Date(slot.startTime);
        if (startDate && slotStart < new Date(startDate)) return false;
        if (endDate && slotStart > new Date(endDate)) return false;
        return true;
      });
    }

    return {
      username,
      settings: userSlots.settings,
      slots: filteredSlots.map((slot) => ({
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        duration: slot.duration,
        timezone: slot.timezone,
        available: slot.available,
      })),
    };
  });
