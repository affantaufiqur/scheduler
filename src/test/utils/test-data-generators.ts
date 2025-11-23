import { DateTime } from "luxon";
import { OrganizerSettings, WorkingHours, BlackoutDates, Booking } from "@/configs/db/schema";

// Generate test organizer settings
export function generateOrganizerSettings(
  overrides: Partial<OrganizerSettings> = {},
): OrganizerSettings {
  return {
    id: "test-organizer-id",
    userId: "test-user-id",
    workingTimezone: "UTC",
    defaultMeetingDuration: 30,
    preBookingBuffer: 0,
    postBookingBuffer: 0,
    minBookingNotice: 2,
    maxBookingAdvance: 14,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

// Generate working hours for a standard 9-5 weekday schedule
export function generateStandardWorkingHours(
  overrides: Partial<WorkingHours> = {},
): WorkingHours[] {
  const baseHours: WorkingHours[] = [
    // Monday (1) to Friday (5)
    {
      id: "wh-1",
      userId: "test-user-id",
      dayOfWeek: "1",
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    {
      id: "wh-2",
      userId: "test-user-id",
      dayOfWeek: "2",
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    {
      id: "wh-3",
      userId: "test-user-id",
      dayOfWeek: "3",
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    {
      id: "wh-4",
      userId: "test-user-id",
      dayOfWeek: "4",
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    {
      id: "wh-5",
      userId: "test-user-id",
      dayOfWeek: "5",
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ];

  return baseHours.map((hour, index) => ({ ...hour, ...overrides }));
}

// Generate blackout dates
export function generateBlackoutDates(
  dates: Date[],
  overrides: Partial<BlackoutDates> = {},
): BlackoutDates[] {
  return dates.map((date, index) => ({
    id: `blackout-${index}`,
    userId: "test-user-id",
    date,
    reason: "Test blackout",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }));
}

// Generate bookings
export function generateBookings(
  bookings: Array<{
    startTime: Date;
    endTime: Date;
    title?: string;
    attendantName?: string;
    attendantEmail?: string;
  }>,
  overrides: Partial<Booking> = {},
): Booking[] {
  return bookings.map((booking, index) => ({
    id: `booking-${index}`,
    organizerId: "test-user-id",
    attendantName: booking.attendantName || "Test Attendee",
    attendantEmail: booking.attendantEmail || "test@example.com",
    metadata: null,
    title: booking.title || "Test Meeting",
    description: null,
    startTime: booking.startTime,
    endTime: booking.endTime,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }));
}

// Helper to create a date at a specific time in a timezone
export function createDateAtTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number = 0,
  timezone: string = "UTC",
): Date {
  return DateTime.fromObject({ year, month, day, hour, minute }, { zone: timezone })
    .toUTC()
    .toJSDate();
}

// Helper to get today's date in a specific timezone
export function getTodayInTimezone(timezone: string = "UTC"): DateTime {
  return DateTime.now().setZone(timezone);
}

// Helper to add days to a date in a specific timezone
export function addDaysInTimezone(
  date: DateTime,
  days: number,
  timezone: string = "UTC",
): DateTime {
  return date.setZone(timezone).plus({ days }).setZone(timezone);
}

// Generate a test schedule for a specific day of the week
export function generateWorkingHoursForDay(
  dayOfWeek: string,
  startTime: string,
  endTime: string,
  userId: string = "test-user-id",
): WorkingHours {
  return {
    id: `wh-${dayOfWeek}-${Date.now()}`,
    userId,
    dayOfWeek,
    startTime,
    endTime,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

// Generate multiple working hour blocks for a day
export function generateMultipleWorkingHoursForDay(
  dayOfWeek: string,
  timeBlocks: Array<{ startTime: string; endTime: string }>,
  userId: string = "test-user-id",
): WorkingHours[] {
  return timeBlocks.map((block, index) => ({
    id: `wh-${dayOfWeek}-${index}-${Date.now()}`,
    userId,
    dayOfWeek,
    startTime: block.startTime,
    endTime: block.endTime,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }));
}
