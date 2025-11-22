import { createServerFn } from "@tanstack/react-start";
import { organizerSettingsSchema } from "./schema";
import { authMiddleware } from "@/middleware/auth";
import { updateOrganizerSettings as updateOrganizerSettingsService } from "@/service/organizer-settings";

export const updateOrganizerSettings = createServerFn({ method: "POST" })
  .inputValidator(organizerSettingsSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const settings = await updateOrganizerSettingsService(userId, data);

    if (!settings) {
      throw new Error("Failed to update organizer settings");
    }

    return {
      id: settings.id,
      userId: settings.userId,
      defaultMeetingDuration: settings.defaultMeetingDuration,
      preBookingBuffer: settings.preBookingBuffer,
      postBookingBuffer: settings.postBookingBuffer,
      minBookingNotice: settings.minBookingNotice,
      maxBookingAdvance: settings.maxBookingAdvance,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
      workingTimezone: settings.workingTimezone,
    };
  });
