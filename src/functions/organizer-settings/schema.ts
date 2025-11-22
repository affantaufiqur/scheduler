import { getTimeZoneValues } from "@/helpers/list-timezone";
import { z } from "zod";

export const organizerSettingsSchema = z.object({
  defaultMeetingDuration: z.number().int().min(15).max(240).optional(),
  preBookingBuffer: z.number().int().min(0).max(120).optional(),
  postBookingBuffer: z.number().int().min(0).max(120).optional(),
  minBookingNotice: z.number().int().min(0).max(168).optional(),
  maxBookingAdvance: z.number().int().min(1).max(365).optional(),
  workingTimezone: z.enum(getTimeZoneValues()).optional(),
});

export type OrganizerSettingsData = z.infer<typeof organizerSettingsSchema>;
