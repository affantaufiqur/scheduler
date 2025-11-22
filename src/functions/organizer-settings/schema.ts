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

const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const workingHoursSchema = z.object({
  id: z.string().optional(),
  dayOfWeek: z.string().refine((val) => {
    const dayNum = parseInt(val);
    return !isNaN(dayNum) && dayNum >= 0 && dayNum <= 6;
  }, { message: "Day of week must be a number between 0-6 (0=Sunday, 6=Saturday)" }),
  startTime: z.string().regex(timeRegex, { message: "Start time must be in HH:mm format (24-hour)" }),
  endTime: z.string().regex(timeRegex, { message: "End time must be in HH:mm format (24-hour)" }),
  isActive: z.boolean().default(true),
}).refine((data) => {
  const startTime = data.startTime.split(":").map(Number);
  const endTime = data.endTime.split(":").map(Number);
  const startMinutes = startTime[0] * 60 + startTime[1];
  const endMinutes = endTime[0] * 60 + endTime[1];
  return endMinutes > startMinutes;
}, { message: "End time must be after start time", path: ["endTime"] });

export const bulkWorkingHoursSchema = z.array(workingHoursSchema);

export type WorkingHoursData = z.infer<typeof workingHoursSchema>;
export type BulkWorkingHoursData = z.infer<typeof bulkWorkingHoursSchema>;
