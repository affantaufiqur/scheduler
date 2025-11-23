import { DateTime, Interval } from "luxon";
import { OrganizerSettings } from "@/configs/db/schema/organizer-settings";
import { WorkingHours } from "@/configs/db/schema/working-hours";
import { BlackoutDates } from "@/configs/db/schema/blackout-dates";
import { Booking } from "@/configs/db/schema/bookings";
import { getOrganizerSettings } from "./organizer-settings";
import { getWorkingHoursByUserId } from "./working-hours";
import { getBlackoutDatesByUserIdAndDateRange } from "./blackout-dates";
import { getBookingsByOrganizerInDateRange } from "./bookings";

// Type definitions
interface CandidateSlot {
  startTimeUTC: DateTime; // UTC timestamp for storage
  endTimeUTC: DateTime; // UTC timestamp for storage
  duration: number; // Minutes
}

interface BufferedBooking extends Booking {
  bufferedStartUTC: DateTime; // Start minus pre-buffer
  bufferedEndUTC: DateTime; // End plus post-buffer
  originalStartUTC: DateTime; // Original booking start
  originalEndUTC: DateTime; // Original booking end
}

interface AvailableSlot {
  startTime: Date; // UTC (JS Date for DB)
  endTime: Date; // UTC (JS Date for DB)
  duration: number; // Minutes
  timezone: string; // Organizer's timezone (for reference)
  available: boolean;
}

interface TimeWindow {
  startInTZ: DateTime;
  endInTZ: DateTime;
  startUTC: DateTime;
  endUTC: DateTime;
}

// Main function to calculate available slots
export async function calculateAvailableSlots(organizerId: string): Promise<{
  slots: AvailableSlot[];
  settings: OrganizerSettings;
}> {
  // 1. Fetch organizer settings (contains timezone and business rules)
  const settings = await getOrganizerSettings(organizerId);
  if (!settings) throw new Error("Organizer settings not found");

  // 2. Initialize time window in organizer's timezone
  const { startInTZ, endInTZ, startUTC, endUTC } = getTimeWindowInTimezone(settings);

  // 3. Fetch all supporting data in parallel
  const [workingHours, blackoutDates, existingBookings] = await Promise.all([
    getWorkingHoursByUserId(organizerId),
    getBlackoutDatesByUserIdAndDateRange(organizerId, startUTC.toJSDate(), endUTC.toJSDate()),
    getBookingsByOrganizerInDateRange(organizerId, startUTC.toJSDate(), endUTC.toJSDate()),
  ]);

  // 4. Generate candidate slots from working hours
  let candidateSlots = generateCandidateSlotsUTC(startInTZ, endInTZ, workingHours, settings);

  // 5. Apply blackout dates (remove entire blocked days)
  candidateSlots = filterSlotsByBlackoutDates(
    candidateSlots,
    blackoutDates,
    settings.workingTimezone,
  );

  // 6. Filter out colliding slots with existing bookings (buffers already applied here)
  const bufferedBookings = applyBufferTimes(existingBookings, settings);
  const availableSlots = filterCollidingSlots(candidateSlots, bufferedBookings);

  // 7. Apply business rules (notice period, no past slots)
  const finalSlots = applyBusinessRulesToSlots(availableSlots, settings);

  // 8. Convert to return format and sort
  const slots = finalSlots
    .map((slot) => ({
      startTime: slot.startTimeUTC.toJSDate(),
      endTime: slot.endTimeUTC.toJSDate(),
      duration: slot.duration,
      timezone: settings.workingTimezone,
      available: true,
    }))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  return {
    slots,
    settings,
  };
}

// Generate time window in the specified timezone
export function getTimeWindowInTimezone(settings: OrganizerSettings): TimeWindow {
  // Get current time in organizer's timezone
  const nowInTZ = DateTime.now().setZone(settings.workingTimezone);

  // Start of today in their timezone
  const startInTZ = nowInTZ.startOf("day");

  // Start of the day at maxBookingAdvance days in future
  const endInTZ = startInTZ.plus({ days: settings.maxBookingAdvance }).startOf("day");

  // Get UTC equivalents for database queries
  const startUTC = startInTZ.toUTC();
  const endUTC = endInTZ.toUTC();

  return { startInTZ, endInTZ, startUTC, endUTC };
}

// Generate candidate slots from working hours
export function generateCandidateSlotsUTC(
  windowStartInTZ: DateTime,
  windowEndInTZ: DateTime,
  workingHours: WorkingHours[],
  settings: OrganizerSettings,
): CandidateSlot[] {
  const slots: CandidateSlot[] = [];
  const timezone = settings.workingTimezone;

  // Iterate through each calendar day in organizer's timezone
  let currentDayInTZ = windowStartInTZ;

  while (currentDayInTZ < windowEndInTZ) {
    // Get day-of-week (0=Sunday, 1=Monday, ... 6=Saturday) in organizer's timezone
    const dayOfWeek = currentDayInTZ.weekday === 7 ? "0" : currentDayInTZ.weekday.toString();

    // Find working hours for this day
    const dayWorkingHours = workingHours.filter((wh) => wh.dayOfWeek === dayOfWeek && wh.isActive);

    // Generate slots for each working hour block
    for (const wh of dayWorkingHours) {
      // Parse start/end times (stored as "HH:mm" strings)
      const [startHour, startMin] = wh.startTime.split(":").map(Number);
      const [endHour, endMin] = wh.endTime.split(":").map(Number);

      // Create working hour boundaries in organizer's timezone
      const workStartInTZ = currentDayInTZ.set({
        hour: startHour,
        minute: startMin,
        second: 0,
        millisecond: 0,
      });

      const workEndInTZ = currentDayInTZ.set({
        hour: endHour,
        minute: endMin,
        second: 0,
        millisecond: 0,
      });

      // Generate discrete slots within this working hour block
      let slotStartInTZ = workStartInTZ;

      while (slotStartInTZ.plus({ minutes: settings.defaultMeetingDuration }) <= workEndInTZ) {
        const slotEndInTZ = slotStartInTZ.plus({ minutes: settings.defaultMeetingDuration });

        // Convert slot times to UTC
        const slotStartUTC = slotStartInTZ.toUTC();
        const slotEndUTC = slotEndInTZ.toUTC();

        slots.push({
          startTimeUTC: slotStartUTC,
          endTimeUTC: slotEndUTC,
          duration: settings.defaultMeetingDuration,
        });

        slotStartInTZ = slotEndInTZ;
      }
    }

    // Move to next day
    currentDayInTZ = currentDayInTZ.plus({ days: 1 });
  }

  return slots;
}

// Filter slots by blackout dates
export function filterSlotsByBlackoutDates(
  candidateSlots: CandidateSlot[],
  blackoutDates: BlackoutDates[],
  timezone: string,
): CandidateSlot[] {
  return candidateSlots.filter((slot) => {
    // Convert slot to organizer's timezone to check day
    const slotInTZ = slot.startTimeUTC.setZone(timezone);
    const slotDay = slotInTZ.startOf("day");

    // Check if slot falls on any blackout date
    return !blackoutDates.some((blackout) => {
      // Convert blackout date (UTC) to organizer's timezone
      const blackoutInTZ = DateTime.fromJSDate(blackout.date).setZone(timezone);
      const blackoutDay = blackoutInTZ.startOf("day");

      // Compare day boundaries
      return slotDay.equals(blackoutDay);
    });
  });
}

// Apply buffer times to bookings
export function applyBufferTimes(
  bookings: Booking[],
  settings: OrganizerSettings,
): BufferedBooking[] {
  return bookings.map((booking) => {
    // Convert to DateTime for easier manipulation
    const startUTC = DateTime.fromJSDate(booking.startTime).toUTC();
    const endUTC = DateTime.fromJSDate(booking.endTime).toUTC();

    return {
      ...booking,
      bufferedStartUTC: startUTC.minus({ minutes: settings.preBookingBuffer }),
      bufferedEndUTC: endUTC.plus({ minutes: settings.postBookingBuffer }),
      originalStartUTC: startUTC,
      originalEndUTC: endUTC,
    };
  });
}

// Filter out slots that collide with bookings
export function filterCollidingSlots(
  candidateSlots: CandidateSlot[],
  bufferedBookings: BufferedBooking[],
): CandidateSlot[] {
  return candidateSlots.filter((slot) => {
    // Check if slot collides with any buffered booking
    return !bufferedBookings.some((booking) => {
      return isSlotCollidingWithBooking(slot, booking);
    });
  });
}

// Check if a slot collides with a booking
function isSlotCollidingWithBooking(slot: CandidateSlot, booking: BufferedBooking): boolean {
  // All times are DateTime objects in UTC
  const slotStart = slot.startTimeUTC;
  const slotEnd = slot.endTimeUTC;
  const bookingStart = booking.bufferedStartUTC;
  const bookingEnd = booking.bufferedEndUTC;

  // Overlap occurs if slot starts before booking ends AND ends after booking starts
  return slotStart < bookingEnd && slotEnd > bookingStart;
}

// Apply business rules to slots
export function applyBusinessRulesToSlots(
  availableSlots: CandidateSlot[],
  settings: OrganizerSettings,
): CandidateSlot[] {
  const nowUTC = DateTime.now().toUTC();
  const minNoticeUTC = nowUTC.plus({ hours: settings.minBookingNotice });

  return availableSlots.filter((slot) => {
    // Filter slots entirely in the past
    if (slot.endTimeUTC <= nowUTC) return false;

    // Filter slots that don't meet minimum notice requirement
    if (slot.startTimeUTC < minNoticeUTC) return false;

    // Note: max advance booking is already handled by window generation

    return true;
  });
}
