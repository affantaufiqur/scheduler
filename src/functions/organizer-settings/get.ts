import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/middleware/auth";
import { getOrganizerSettings as getOrganizerSettingsService } from "@/service/organizer-settings";
import { TimeZoneValue } from "@/helpers/list-timezone";

export const getOrganizerSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    const settings = await getOrganizerSettingsService(userId);

    if (!settings) {
      throw new Error("Organizer settings not found. Please contact support.");
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
      workingTimezone: settings.workingTimezone as TimeZoneValue,
      deletedAt: settings.deletedAt || null,
    };
  });
