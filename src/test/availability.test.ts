import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DateTime } from "luxon";
import {
  getTimeWindowInTimezone,
  generateCandidateSlotsUTC,
  filterSlotsByBlackoutDates,
  applyBufferTimes,
  filterCollidingSlots,
  applyBusinessRulesToSlots,
} from "@/service/availability";
import {
  generateOrganizerSettings,
  generateStandardWorkingHours,
  generateBlackoutDates,
  generateBookings,
  createDateAtTime,
  generateWorkingHoursForDay,
  generateMultipleWorkingHoursForDay,
} from "./utils/test-data-generators";

// Mock the service functions that fetch data from database
vi.mock("@/service/organizer-settings", () => ({
  getOrganizerSettings: vi.fn(),
}));

vi.mock("@/service/working-hours", () => ({
  getWorkingHoursByUserId: vi.fn(),
}));

vi.mock("@/service/blackout-dates", () => ({
  getBlackoutDatesByUserIdAndDateRange: vi.fn(),
}));

// Mock bookings service
vi.mock("@/service/bookings", () => ({
  getBookingsByOrganizerInDateRange: vi.fn(),
}));

describe("Availability", () => {
  // Helper to mock DateTime.now() since vi.setSystemTime() only affects Date, not Luxon
  const mockDateTimeNow = (
    year: number,
    month: number,
    day: number,
    hour: number = 0,
    minute: number = 0,
  ) => {
    const mockedNow = DateTime.fromObject({ year, month, day, hour, minute }, { zone: "UTC" });
    vi.spyOn(DateTime, "now").mockReturnValue(mockedNow as DateTime<true>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("getTimeWindowInTimezone", () => {
    it("should generate correct time window in UTC", () => {
      // Mock DateTime.now() to Nov 23, 2025, 10 AM UTC
      // Note: Luxon uses 1-based months (11 = November)
      mockDateTimeNow(2025, 11, 23, 10, 0);

      const settings = generateOrganizerSettings({
        workingTimezone: "UTC",
        maxBookingAdvance: 14,
      });

      const window = getTimeWindowInTimezone(settings);

      expect(window.startInTZ.zoneName).toBe("UTC");
      expect(window.endInTZ.zoneName).toBe("UTC");
      expect(window.startUTC.zoneName).toBe("UTC");
      expect(window.endUTC.zoneName).toBe("UTC");

      // Check that the window spans exactly 14 days
      const duration = window.endInTZ.diff(window.startInTZ, "days");
      expect(duration.days).toBe(14);
    });

    it("should handle non-UTC timezone correctly", () => {
      // Mock DateTime.now() to Nov 23, 2025, 10 AM UTC
      mockDateTimeNow(2025, 11, 23, 10, 0);

      const settings = generateOrganizerSettings({
        workingTimezone: "America/New_York",
        maxBookingAdvance: 7,
      });

      const window = getTimeWindowInTimezone(settings);

      expect(window.startInTZ.zoneName).toBe("America/New_York");
      expect(window.endInTZ.zoneName).toBe("America/New_York");

      // The UTC times should be different due to timezone conversion
      const duration = window.endInTZ.diff(window.startInTZ, "days");
      expect(duration.days).toBe(7);
    });
  });

  describe("generateCandidateSlotsUTC", () => {
    it("should generate correct slots for standard 9-5 schedule", () => {
      const windowStart = DateTime.fromObject(
        { year: 2025, month: 11, day: 24 }, // Monday
        { zone: "UTC" },
      );
      const windowEnd = windowStart.plus({ days: 1 });

      const workingHours = generateStandardWorkingHours();
      const settings = generateOrganizerSettings({
        defaultMeetingDuration: 60,
        workingTimezone: "UTC",
      });

      const slots = generateCandidateSlotsUTC(windowStart, windowEnd, workingHours, settings);

      // For a 9-5 schedule with 60-minute slots, we should get 8 slots (9-10, 10-11, ..., 16-17)
      expect(slots).toHaveLength(8);

      // Check first slot
      expect(slots[0].startTimeUTC.hour).toBe(9);
      expect(slots[0].startTimeUTC.minute).toBe(0);
      expect(slots[0].endTimeUTC.hour).toBe(10);
      expect(slots[0].endTimeUTC.minute).toBe(0);

      // Check last slot
      const lastSlot = slots[slots.length - 1];
      expect(lastSlot.startTimeUTC.hour).toBe(16);
      expect(lastSlot.startTimeUTC.minute).toBe(0);
      expect(lastSlot.endTimeUTC.hour).toBe(17);
      expect(lastSlot.endTimeUTC.minute).toBe(0);
    });

    it("should generate correct slots for 30-minute meetings", () => {
      const windowStart = DateTime.fromObject(
        { year: 2025, month: 11, day: 24 }, // Monday
        { zone: "UTC" },
      );
      const windowEnd = windowStart.plus({ days: 1 });

      const workingHours = generateStandardWorkingHours();
      const settings = generateOrganizerSettings({
        defaultMeetingDuration: 30,
        workingTimezone: "UTC",
      });

      const slots = generateCandidateSlotsUTC(windowStart, windowEnd, workingHours, settings);

      // For a 9-5 schedule with 30-minute slots, we should get 16 slots
      expect(slots).toHaveLength(16);
    });

    it("should handle non-UTC timezone correctly", () => {
      const windowStart = DateTime.fromObject(
        { year: 2025, month: 11, day: 24 }, // Monday
        { zone: "America/New_York" },
      );
      const windowEnd = windowStart.plus({ days: 1 });

      const workingHours = generateStandardWorkingHours();
      const settings = generateOrganizerSettings({
        defaultMeetingDuration: 60,
        workingTimezone: "America/New_York",
      });

      const slots = generateCandidateSlotsUTC(windowStart, windowEnd, workingHours, settings);

      // Should still generate 8 slots
      expect(slots).toHaveLength(8);

      // All slots should be in UTC (zone should be UTC)
      expect(slots[0].startTimeUTC.zoneName).toBe("UTC");
      expect(slots[0].endTimeUTC.zoneName).toBe("UTC");
    });

    it("should handle multiple working blocks in a day", () => {
      const windowStart = DateTime.fromObject(
        { year: 2025, month: 11, day: 24 }, // Monday
        { zone: "UTC" },
      );
      const windowEnd = windowStart.plus({ days: 1 });

      const workingHours = generateMultipleWorkingHoursForDay("1", [
        { startTime: "09:00", endTime: "12:00" }, // Morning block
        { startTime: "14:00", endTime: "17:00" }, // Afternoon block
      ]);
      const settings = generateOrganizerSettings({
        defaultMeetingDuration: 60,
        workingTimezone: "UTC",
      });

      const slots = generateCandidateSlotsUTC(windowStart, windowEnd, workingHours, settings);

      // Morning: 3 slots (9-10, 10-11, 11-12)
      // Afternoon: 3 slots (14-15, 15-16, 16-17)
      expect(slots).toHaveLength(6);
    });
  });

  describe("filterSlotsByBlackoutDates", () => {
    it("should remove slots on blackout dates", () => {
      const timezone = "UTC";
      const blackoutDates = generateBlackoutDates([
        createDateAtTime(2025, 11, 25, 0, 0), // Tuesday
      ]);

      // Create slots on Monday and Tuesday
      const slots = [
        {
          startTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 9 },
            { zone: "UTC" },
          ),
          endTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 10 },
            { zone: "UTC" },
          ),
          duration: 60,
        },
        {
          startTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 25, hour: 9 },
            { zone: "UTC" },
          ),
          endTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 25, hour: 10 },
            { zone: "UTC" },
          ),
          duration: 60,
        },
      ];

      const filteredSlots = filterSlotsByBlackoutDates(slots, blackoutDates, timezone);

      // Should only keep the Monday slot
      expect(filteredSlots).toHaveLength(1);
      expect(filteredSlots[0].startTimeUTC.day).toBe(24);
    });

    it("should handle blackout dates in different timezone", () => {
      const timezone = "America/New_York";
      const blackoutDates = generateBlackoutDates([
        createDateAtTime(2025, 11, 25, 0, 0), // Tuesday in UTC
      ]);

      // Create a slot that's on Tuesday in New York but Monday in UTC
      const slots = [
        {
          startTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 25, hour: 2 },
            { zone: "UTC" },
          ), // 9 PM Monday in New York
          endTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 25, hour: 3 },
            { zone: "UTC" },
          ), // 10 PM Monday in New York
          duration: 60,
        },
      ];

      const filteredSlots = filterSlotsByBlackoutDates(slots, blackoutDates, timezone);

      // This should be filtered out because it's Tuesday in the blackout date's timezone context
      expect(filteredSlots).toHaveLength(0);
    });
  });

  describe("applyBufferTimes", () => {
    it("should apply buffer times correctly", () => {
      const settings = generateOrganizerSettings({
        preBookingBuffer: 15,
        postBookingBuffer: 30,
      });

      const bookings = generateBookings([
        {
          startTime: createDateAtTime(2025, 11, 24, 10, 0),
          endTime: createDateAtTime(2025, 11, 24, 11, 0),
        },
      ]);

      const bufferedBookings = applyBufferTimes(bookings, settings);

      expect(bufferedBookings).toHaveLength(1);
      const buffered = bufferedBookings[0];

      // Original times
      expect(buffered.originalStartUTC.hour).toBe(10);
      expect(buffered.originalStartUTC.minute).toBe(0);
      expect(buffered.originalEndUTC.hour).toBe(11);
      expect(buffered.originalEndUTC.minute).toBe(0);

      // Buffered times
      expect(buffered.bufferedStartUTC.hour).toBe(9);
      expect(buffered.bufferedStartUTC.minute).toBe(45);
      expect(buffered.bufferedEndUTC.hour).toBe(11);
      expect(buffered.bufferedEndUTC.minute).toBe(30);
    });

    it("should handle zero buffer times", () => {
      const settings = generateOrganizerSettings({
        preBookingBuffer: 0,
        postBookingBuffer: 0,
      });

      const bookings = generateBookings([
        {
          startTime: createDateAtTime(2025, 11, 24, 10, 0),
          endTime: createDateAtTime(2025, 11, 24, 11, 0),
        },
      ]);

      const bufferedBookings = applyBufferTimes(bookings, settings);

      expect(bufferedBookings).toHaveLength(1);
      const buffered = bufferedBookings[0];

      // Buffered times should equal original times
      expect(buffered.bufferedStartUTC.equals(buffered.originalStartUTC)).toBe(true);
      expect(buffered.bufferedEndUTC.equals(buffered.originalEndUTC)).toBe(true);
    });
  });

  describe("filterCollidingSlots", () => {
    it("should remove slots that collide with buffered bookings", () => {
      const slots = [
        {
          startTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 9 },
            { zone: "UTC" },
          ),
          endTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 10 },
            { zone: "UTC" },
          ),
          duration: 60,
        },
        {
          startTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 10 },
            { zone: "UTC" },
          ),
          endTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 11 },
            { zone: "UTC" },
          ),
          duration: 60,
        },
        {
          startTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 11 },
            { zone: "UTC" },
          ),
          endTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 12 },
            { zone: "UTC" },
          ),
          duration: 60,
        },
      ];

      const bufferedBookings = [
        {
          id: "booking-1",
          organizerId: "test-user-id",
          attendantName: "Test Attendee",
          attendantEmail: "test@example.com",
          metadata: null,
          title: "Test Meeting",
          description: null,
          startTime: createDateAtTime(2025, 11, 24, 10, 0),
          endTime: createDateAtTime(2025, 11, 24, 11, 0),
          createdAt: new Date(),
          updatedAt: new Date(),
          bufferedStartUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 9, minute: 45 },
            { zone: "UTC" },
          ),
          bufferedEndUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 11, minute: 30 },
            { zone: "UTC" },
          ),
          originalStartUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 10, minute: 0 },
            { zone: "UTC" },
          ),
          originalEndUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 11, minute: 0 },
            { zone: "UTC" },
          ),
          deletedAt: null,
        },
      ];

      const filteredSlots = filterCollidingSlots(slots, bufferedBookings);

      // All slots should be filtered out since the buffered booking (9:45-11:30) overlaps with all three slots
      expect(filteredSlots).toHaveLength(0);
    });
  });

  describe("applyBusinessRulesToSlots", () => {
    it("should filter out past slots", () => {
      // Mock DateTime.now() to Nov 24, 2025, 10 AM UTC
      mockDateTimeNow(2025, 11, 24, 10, 0);

      const settings = generateOrganizerSettings({
        minBookingNotice: 0, // No minimum notice for this test
      });

      const slots = [
        {
          startTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 9 },
            { zone: "UTC" },
          ),
          endTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 10 },
            { zone: "UTC" },
          ),
          duration: 60,
        },
        {
          startTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 11 },
            { zone: "UTC" },
          ),
          endTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 12 },
            { zone: "UTC" },
          ),
          duration: 60,
        },
      ];

      const filteredSlots = applyBusinessRulesToSlots(slots, settings);

      // Only the 11 AM slot should be kept (the 9 AM slot ends at 10 AM which is <= now)
      expect(filteredSlots).toHaveLength(1);
      expect(filteredSlots[0].startTimeUTC.hour).toBe(11);
    });

    it("should filter out slots that don't meet minimum notice", () => {
      // Mock DateTime.now() to Nov 24, 2025, 10 AM UTC
      mockDateTimeNow(2025, 11, 24, 10, 0);

      const settings = generateOrganizerSettings({
        minBookingNotice: 2, // 2 hours
      });

      const slots = [
        {
          startTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 11 },
            { zone: "UTC" },
          ),
          endTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 12 },
            { zone: "UTC" },
          ),
          duration: 60,
        },
        {
          startTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 14 },
            { zone: "UTC" },
          ),
          endTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 15 },
            { zone: "UTC" },
          ),
          duration: 60,
        },
      ];

      const filteredSlots = applyBusinessRulesToSlots(slots, settings);

      // 11 AM slot is only 1 hour away (less than 2-hour minimum) - should be filtered
      // 2 PM slot is 4 hours away - should be kept
      expect(filteredSlots).toHaveLength(1);
      expect(filteredSlots[0].startTimeUTC.hour).toBe(14);
    });

    it("should handle minimum notice boundary correctly", () => {
      // Mock DateTime.now() to Nov 24, 2025, 10 AM UTC
      mockDateTimeNow(2025, 11, 24, 10, 0);

      const settings = generateOrganizerSettings({
        minBookingNotice: 2, // 2 hours
      });

      const slots = [
        {
          startTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 12 },
            { zone: "UTC" },
          ),
          endTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 13 },
            { zone: "UTC" },
          ),
          duration: 60,
        },
        {
          // Just over 2 hours away - definitely kept
          startTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 12, minute: 1 },
            { zone: "UTC" },
          ),
          endTimeUTC: DateTime.fromObject(
            { year: 2025, month: 11, day: 24, hour: 13, minute: 1 },
            { zone: "UTC" },
          ),
          duration: 60,
        },
      ];

      const filteredSlots = applyBusinessRulesToSlots(slots, settings);

      // Both slots pass: 12:00 is NOT < 12:00, and 12:01 is NOT < 12:00
      expect(filteredSlots).toHaveLength(2);
    });
  });

  describe("Full Availability Pipeline (End-to-End with Mock Data)", () => {
    it("should generate available slots with no bookings or blackouts", () => {
      // Mock DateTime.now() to Nov 24, 2025, 9 AM UTC (Monday)
      mockDateTimeNow(2025, 11, 24, 9, 0);

      const settings = generateOrganizerSettings({
        workingTimezone: "UTC",
        defaultMeetingDuration: 60,
        maxBookingAdvance: 3, // 3 days for simpler test
        minBookingNotice: 1, // 1 hour
      });

      const workingHours = generateStandardWorkingHours();
      const blackoutDates: any[] = [];
      const bookings: any[] = [];

      // Manually execute the pipeline
      const { startInTZ, endInTZ } = getTimeWindowInTimezone(settings);
      let candidateSlots = generateCandidateSlotsUTC(startInTZ, endInTZ, workingHours, settings);
      candidateSlots = filterSlotsByBlackoutDates(
        candidateSlots,
        blackoutDates,
        settings.workingTimezone,
      );
      const bufferedBookings = applyBufferTimes(bookings, settings);
      candidateSlots = filterCollidingSlots(candidateSlots, bufferedBookings);
      const finalSlots = applyBusinessRulesToSlots(candidateSlots, settings);

      // Should have slots for 3 days (Mon, Tue, Wed)
      // Each day has 8 slots (9-5 with 60-min meetings)
      // But Monday's first slot (10-11 AM) might be kept since we're at 9 AM + 1 hour notice
      expect(finalSlots.length).toBeGreaterThan(0);
      expect(finalSlots.every((slot) => slot.duration === 60)).toBe(true);
    });

    it("should filter out slots on blackout dates", () => {
      // Mock DateTime.now() to Nov 24, 2025, 9 AM UTC (Monday)
      mockDateTimeNow(2025, 11, 24, 9, 0);

      const settings = generateOrganizerSettings({
        workingTimezone: "UTC",
        defaultMeetingDuration: 60,
        maxBookingAdvance: 3,
        minBookingNotice: 1,
      });

      const workingHours = generateStandardWorkingHours();

      // Blackout Tuesday (Nov 25)
      const blackoutDates = generateBlackoutDates([createDateAtTime(2025, 11, 25, 0, 0)]);
      const bookings: any[] = [];

      // Manually execute the pipeline
      const { startInTZ, endInTZ } = getTimeWindowInTimezone(settings);
      let candidateSlots = generateCandidateSlotsUTC(startInTZ, endInTZ, workingHours, settings);
      candidateSlots = filterSlotsByBlackoutDates(
        candidateSlots,
        blackoutDates,
        settings.workingTimezone,
      );
      const bufferedBookings = applyBufferTimes(bookings, settings);
      candidateSlots = filterCollidingSlots(candidateSlots, bufferedBookings);
      const finalSlots = applyBusinessRulesToSlots(candidateSlots, settings);

      // No slots should be on Nov 25 (Tuesday)
      const tuesdaySlots = finalSlots.filter((slot) => {
        const slotDate = slot.startTimeUTC.setZone("UTC");
        return slotDate.day === 25;
      });

      expect(tuesdaySlots).toHaveLength(0);
    });

    it("should filter out slots that collide with bookings including buffers", () => {
      // Mock DateTime.now() to Nov 24, 2025, 9 AM UTC (Monday)
      mockDateTimeNow(2025, 11, 24, 9, 0);

      const settings = generateOrganizerSettings({
        workingTimezone: "UTC",
        defaultMeetingDuration: 60,
        maxBookingAdvance: 3,
        minBookingNotice: 1,
        preBookingBuffer: 15, // 15 min before
        postBookingBuffer: 30, // 30 min after
      });

      const workingHours = generateStandardWorkingHours();
      const blackoutDates: any[] = [];

      // Booking on Tuesday 10-11 AM
      // With buffers: 9:45 AM - 11:30 AM is blocked
      const bookings = generateBookings([
        {
          startTime: createDateAtTime(2025, 11, 25, 10, 0),
          endTime: createDateAtTime(2025, 11, 25, 11, 0),
        },
      ]);

      // Manually execute the pipeline
      const { startInTZ, endInTZ } = getTimeWindowInTimezone(settings);
      let candidateSlots = generateCandidateSlotsUTC(startInTZ, endInTZ, workingHours, settings);
      candidateSlots = filterSlotsByBlackoutDates(
        candidateSlots,
        blackoutDates,
        settings.workingTimezone,
      );
      const bufferedBookings = applyBufferTimes(bookings, settings);
      candidateSlots = filterCollidingSlots(candidateSlots, bufferedBookings);
      const finalSlots = applyBusinessRulesToSlots(candidateSlots, settings);

      // Check Tuesday slots - 10 AM and 11 AM should be filtered
      const tuesdaySlots = finalSlots.filter((slot) => {
        const slotDate = slot.startTimeUTC.setZone("UTC");
        return slotDate.day === 25;
      });

      const tuesdayHours = tuesdaySlots.map((slot) => slot.startTimeUTC.hour);

      // Should not have 10 AM or 11 AM slots (blocked by booking + buffers)
      expect(tuesdayHours).not.toContain(10);
      expect(tuesdayHours).not.toContain(11);

      // 9 AM slot (9:00-10:00) overlaps with buffer (9:45-11:30), so it's also blocked
      // Overlap occurs because slot ends at 10:00 which is > buffer start at 9:45
      expect(tuesdayHours).not.toContain(9);

      // Should have 12 PM onwards (after the booking buffer ends at 11:30 AM)
      expect(tuesdaySlots.length).toBeGreaterThan(0);
      expect(tuesdayHours).toContain(12);
    });

    it("should handle non-UTC timezone correctly", () => {
      // Mock DateTime.now() to Nov 24, 2025, 2 PM UTC (9 AM EST)
      mockDateTimeNow(2025, 11, 24, 14, 0);

      const settings = generateOrganizerSettings({
        workingTimezone: "America/New_York",
        defaultMeetingDuration: 60,
        maxBookingAdvance: 2,
        minBookingNotice: 1,
      });

      const workingHours = generateStandardWorkingHours();
      const blackoutDates: any[] = [];
      const bookings: any[] = [];

      // Manually execute the pipeline
      const { startInTZ, endInTZ } = getTimeWindowInTimezone(settings);
      let candidateSlots = generateCandidateSlotsUTC(startInTZ, endInTZ, workingHours, settings);
      candidateSlots = filterSlotsByBlackoutDates(
        candidateSlots,
        blackoutDates,
        settings.workingTimezone,
      );
      const bufferedBookings = applyBufferTimes(bookings, settings);
      candidateSlots = filterCollidingSlots(candidateSlots, bufferedBookings);
      const finalSlots = applyBusinessRulesToSlots(candidateSlots, settings);

      // All slots should be in UTC (internal representation)
      expect(finalSlots.every((slot) => slot.startTimeUTC.zoneName === "UTC")).toBe(true);
      expect(finalSlots.every((slot) => slot.endTimeUTC.zoneName === "UTC")).toBe(true);

      // Slots should be available
      expect(finalSlots.length).toBeGreaterThan(0);
    });

    it("should handle complex scenario with multiple bookings and blackouts", () => {
      // Mock DateTime.now() to Nov 24, 2025, 9 AM UTC (Monday)
      mockDateTimeNow(2025, 11, 24, 9, 0);

      const settings = generateOrganizerSettings({
        workingTimezone: "UTC",
        defaultMeetingDuration: 60,
        maxBookingAdvance: 5,
        minBookingNotice: 2, // 2 hours
        preBookingBuffer: 15,
        postBookingBuffer: 15,
      });

      const workingHours = generateStandardWorkingHours();

      // Blackout Wednesday (Nov 26)
      const blackoutDates = generateBlackoutDates([createDateAtTime(2025, 11, 26, 0, 0)]);

      // Multiple bookings on different days
      const bookings = generateBookings([
        {
          startTime: createDateAtTime(2025, 11, 24, 14, 0), // Monday 2-3 PM
          endTime: createDateAtTime(2025, 11, 24, 15, 0),
        },
        {
          startTime: createDateAtTime(2025, 11, 25, 10, 0), // Tuesday 10-11 AM
          endTime: createDateAtTime(2025, 11, 25, 11, 0),
        },
        {
          startTime: createDateAtTime(2025, 11, 27, 16, 0), // Thursday 4-5 PM
          endTime: createDateAtTime(2025, 11, 27, 17, 0),
        },
      ]);

      // Manually execute the pipeline
      const { startInTZ, endInTZ } = getTimeWindowInTimezone(settings);
      let candidateSlots = generateCandidateSlotsUTC(startInTZ, endInTZ, workingHours, settings);

      const initialSlotCount = candidateSlots.length;

      candidateSlots = filterSlotsByBlackoutDates(
        candidateSlots,
        blackoutDates,
        settings.workingTimezone,
      );
      const bufferedBookings = applyBufferTimes(bookings, settings);
      candidateSlots = filterCollidingSlots(candidateSlots, bufferedBookings);
      const finalSlots = applyBusinessRulesToSlots(candidateSlots, settings);

      // Should have filtered out slots
      expect(finalSlots.length).toBeLessThan(initialSlotCount);

      // No Wednesday slots (blackout)
      const wednesdaySlots = finalSlots.filter((slot) => slot.startTimeUTC.day === 26);
      expect(wednesdaySlots).toHaveLength(0);

      // No Monday 2 PM or 3 PM (booking + buffers)
      const mondaySlots = finalSlots.filter((slot) => slot.startTimeUTC.day === 24);
      const mondayHours = mondaySlots.map((slot) => slot.startTimeUTC.hour);
      expect(mondayHours).not.toContain(14);
      expect(mondayHours).not.toContain(15);

      // Should have some valid slots
      expect(finalSlots.length).toBeGreaterThan(0);
    });

    it("should respect maxBookingAdvance window (less than 14 days)", () => {
      // Mock DateTime.now() to Nov 24, 2025, 9 AM UTC (Monday)
      mockDateTimeNow(2025, 11, 24, 9, 0);

      const settings = generateOrganizerSettings({
        workingTimezone: "UTC",
        defaultMeetingDuration: 60,
        maxBookingAdvance: 2, // Only 2 days
        minBookingNotice: 1,
      });

      const workingHours = generateStandardWorkingHours();
      const blackoutDates: any[] = [];
      const bookings: any[] = [];

      // Manually execute the pipeline
      const { startInTZ, endInTZ } = getTimeWindowInTimezone(settings);
      let candidateSlots = generateCandidateSlotsUTC(startInTZ, endInTZ, workingHours, settings);
      candidateSlots = filterSlotsByBlackoutDates(
        candidateSlots,
        blackoutDates,
        settings.workingTimezone,
      );
      const bufferedBookings = applyBufferTimes(bookings, settings);
      candidateSlots = filterCollidingSlots(candidateSlots, bufferedBookings);
      const finalSlots = applyBusinessRulesToSlots(candidateSlots, settings);

      // Should only have slots for 2 days (Mon Nov 24, Tue Nov 25)
      const mondaySlots = finalSlots.filter((slot) => slot.startTimeUTC.day === 24);
      const tuesdaySlots = finalSlots.filter((slot) => slot.startTimeUTC.day === 25);
      const wednesdaySlots = finalSlots.filter((slot) => slot.startTimeUTC.day === 26);

      expect(mondaySlots.length).toBeGreaterThan(0);
      expect(tuesdaySlots.length).toBeGreaterThan(0);
      expect(wednesdaySlots).toHaveLength(0); // Day 3 should not exist
    });

    it("should respect maxBookingAdvance window (more than 14 days)", () => {
      // Mock DateTime.now() to Nov 24, 2025, 9 AM UTC (Monday)
      mockDateTimeNow(2025, 11, 24, 9, 0);

      const settings = generateOrganizerSettings({
        workingTimezone: "UTC",
        defaultMeetingDuration: 60,
        maxBookingAdvance: 21, // 3 weeks
        minBookingNotice: 1,
      });

      const workingHours = generateStandardWorkingHours();
      const blackoutDates: any[] = [];
      const bookings: any[] = [];

      // Manually execute the pipeline
      const { startInTZ, endInTZ } = getTimeWindowInTimezone(settings);
      let candidateSlots = generateCandidateSlotsUTC(startInTZ, endInTZ, workingHours, settings);
      candidateSlots = filterSlotsByBlackoutDates(
        candidateSlots,
        blackoutDates,
        settings.workingTimezone,
      );
      const bufferedBookings = applyBufferTimes(bookings, settings);
      candidateSlots = filterCollidingSlots(candidateSlots, bufferedBookings);
      const finalSlots = applyBusinessRulesToSlots(candidateSlots, settings);

      // Should have slots spanning 21 days (15 weekdays)
      // Get unique days
      const uniqueDays = new Set(finalSlots.map((slot) => slot.startTimeUTC.day));

      // Should have at least 15 unique days (Mon-Fri for 3 weeks)
      expect(uniqueDays.size).toBeGreaterThanOrEqual(15);

      // Should have slots on day 14 (Dec 8, 2025)
      const day14Slots = finalSlots.filter(
        (slot) => slot.startTimeUTC.day === 8 && slot.startTimeUTC.month === 12,
      );
      expect(day14Slots.length).toBeGreaterThan(0);
    });

    it("should skip weekend days when working hours only include weekdays", () => {
      // Mock DateTime.now() to Nov 24, 2025, 9 AM UTC (Monday)
      mockDateTimeNow(2025, 11, 24, 9, 0);

      const settings = generateOrganizerSettings({
        workingTimezone: "UTC",
        defaultMeetingDuration: 60,
        maxBookingAdvance: 7,
        minBookingNotice: 1,
      });

      // Standard working hours (Mon-Fri only, no weekend)
      const workingHours = generateStandardWorkingHours();
      const blackoutDates: any[] = [];
      const bookings: any[] = [];

      // Manually execute the pipeline
      const { startInTZ, endInTZ } = getTimeWindowInTimezone(settings);
      let candidateSlots = generateCandidateSlotsUTC(startInTZ, endInTZ, workingHours, settings);
      candidateSlots = filterSlotsByBlackoutDates(
        candidateSlots,
        blackoutDates,
        settings.workingTimezone,
      );
      const bufferedBookings = applyBufferTimes(bookings, settings);
      candidateSlots = filterCollidingSlots(candidateSlots, bufferedBookings);
      const finalSlots = applyBusinessRulesToSlots(candidateSlots, settings);

      // Check for weekend slots (Saturday Nov 29, Sunday Nov 30)
      const saturdaySlots = finalSlots.filter((slot) => slot.startTimeUTC.day === 29);
      const sundaySlots = finalSlots.filter((slot) => slot.startTimeUTC.day === 30);

      expect(saturdaySlots).toHaveLength(0);
      expect(sundaySlots).toHaveLength(0);

      // Should have weekday slots
      const mondaySlots = finalSlots.filter((slot) => slot.startTimeUTC.day === 24);
      expect(mondaySlots.length).toBeGreaterThan(0);
    });

    it("should generate slots for weekend when working hours include weekends", () => {
      // Mock DateTime.now() to Nov 24, 2025, 9 AM UTC (Monday)
      mockDateTimeNow(2025, 11, 24, 9, 0);

      const settings = generateOrganizerSettings({
        workingTimezone: "UTC",
        defaultMeetingDuration: 60,
        maxBookingAdvance: 7,
        minBookingNotice: 1,
      });

      // Include Saturday and Sunday
      const workingHours = [
        ...generateStandardWorkingHours(), // Mon-Fri
        generateWorkingHoursForDay("6", "10:00", "14:00"), // Saturday
        generateWorkingHoursForDay("0", "10:00", "14:00"), // Sunday
      ];
      const blackoutDates: any[] = [];
      const bookings: any[] = [];

      // Manually execute the pipeline
      const { startInTZ, endInTZ } = getTimeWindowInTimezone(settings);
      let candidateSlots = generateCandidateSlotsUTC(startInTZ, endInTZ, workingHours, settings);
      candidateSlots = filterSlotsByBlackoutDates(
        candidateSlots,
        blackoutDates,
        settings.workingTimezone,
      );
      const bufferedBookings = applyBufferTimes(bookings, settings);
      candidateSlots = filterCollidingSlots(candidateSlots, bufferedBookings);
      const finalSlots = applyBusinessRulesToSlots(candidateSlots, settings);

      // Should have slots on Saturday (Nov 29) and Sunday (Nov 30)
      const saturdaySlots = finalSlots.filter((slot) => slot.startTimeUTC.day === 29);
      const sundaySlots = finalSlots.filter((slot) => slot.startTimeUTC.day === 30);

      expect(saturdaySlots.length).toBeGreaterThan(0);
      expect(sundaySlots.length).toBeGreaterThan(0);

      // Saturday/Sunday should have 4 slots each (10-2 with 60-min meetings)
      expect(saturdaySlots).toHaveLength(4);
      expect(sundaySlots).toHaveLength(4);
    });

    it("should not generate slots for inactive working hours", () => {
      // Mock DateTime.now() to Nov 24, 2025, 9 AM UTC (Monday)
      mockDateTimeNow(2025, 11, 24, 9, 0);

      const settings = generateOrganizerSettings({
        workingTimezone: "UTC",
        defaultMeetingDuration: 60,
        maxBookingAdvance: 3,
        minBookingNotice: 1,
      });

      // Mark Tuesday as inactive
      const workingHours = generateStandardWorkingHours().map((wh) =>
        wh.dayOfWeek === "2" ? { ...wh, isActive: false } : wh,
      );
      const blackoutDates: any[] = [];
      const bookings: any[] = [];

      // Manually execute the pipeline
      const { startInTZ, endInTZ } = getTimeWindowInTimezone(settings);
      let candidateSlots = generateCandidateSlotsUTC(startInTZ, endInTZ, workingHours, settings);
      candidateSlots = filterSlotsByBlackoutDates(
        candidateSlots,
        blackoutDates,
        settings.workingTimezone,
      );
      const bufferedBookings = applyBufferTimes(bookings, settings);
      candidateSlots = filterCollidingSlots(candidateSlots, bufferedBookings);
      const finalSlots = applyBusinessRulesToSlots(candidateSlots, settings);

      // Should not have Tuesday slots (Nov 25)
      const tuesdaySlots = finalSlots.filter((slot) => slot.startTimeUTC.day === 25);
      expect(tuesdaySlots).toHaveLength(0);

      // Should have Monday and Wednesday slots
      const mondaySlots = finalSlots.filter((slot) => slot.startTimeUTC.day === 24);
      const wednesdaySlots = finalSlots.filter((slot) => slot.startTimeUTC.day === 26);
      expect(mondaySlots.length).toBeGreaterThan(0);
      expect(wednesdaySlots.length).toBeGreaterThan(0);
    });

    it("should handle organizer with only one working day per week", () => {
      // Mock DateTime.now() to Nov 24, 2025, 9 AM UTC (Monday)
      mockDateTimeNow(2025, 11, 24, 9, 0);

      const settings = generateOrganizerSettings({
        workingTimezone: "UTC",
        defaultMeetingDuration: 60,
        maxBookingAdvance: 14,
        minBookingNotice: 1,
      });

      // Only work on Wednesdays
      const workingHours = [generateWorkingHoursForDay("3", "09:00", "17:00")];
      const blackoutDates: any[] = [];
      const bookings: any[] = [];

      // Manually execute the pipeline
      const { startInTZ, endInTZ } = getTimeWindowInTimezone(settings);
      let candidateSlots = generateCandidateSlotsUTC(startInTZ, endInTZ, workingHours, settings);
      candidateSlots = filterSlotsByBlackoutDates(
        candidateSlots,
        blackoutDates,
        settings.workingTimezone,
      );
      const bufferedBookings = applyBufferTimes(bookings, settings);
      candidateSlots = filterCollidingSlots(candidateSlots, bufferedBookings);
      const finalSlots = applyBusinessRulesToSlots(candidateSlots, settings);

      // Get unique day-of-week values
      const uniqueDaysOfWeek = new Set(
        finalSlots.map((slot) => slot.startTimeUTC.setZone("UTC").weekday),
      );

      // Should only have Wednesday (weekday 3 in Luxon)
      expect(uniqueDaysOfWeek.size).toBe(1);
      expect(uniqueDaysOfWeek.has(3)).toBe(true);

      // Should have multiple Wednesdays across 14 days (Nov 26, Dec 3)
      const wed1Slots = finalSlots.filter(
        (slot) => slot.startTimeUTC.day === 26 && slot.startTimeUTC.month === 11,
      );
      const wed2Slots = finalSlots.filter(
        (slot) => slot.startTimeUTC.day === 3 && slot.startTimeUTC.month === 12,
      );

      expect(wed1Slots).toHaveLength(8); // 9-5 with 60-min slots
      expect(wed2Slots).toHaveLength(8);
    });

    it("should handle buffer crossing midnight boundary", () => {
      // Mock DateTime.now() to Nov 24, 2025, 9 AM UTC (Monday)
      mockDateTimeNow(2025, 11, 24, 9, 0);

      const settings = generateOrganizerSettings({
        workingTimezone: "UTC",
        defaultMeetingDuration: 60,
        maxBookingAdvance: 3,
        minBookingNotice: 1,
        preBookingBuffer: 15,
        postBookingBuffer: 45, // 45-minute buffer after
      });

      // Working hours that span late evening
      const workingHours = [
        generateWorkingHoursForDay("1", "20:00", "24:00"), // Monday 8 PM - midnight
        generateWorkingHoursForDay("2", "00:00", "02:00"), // Tuesday midnight - 2 AM
      ];

      // Booking on Monday 23:00-24:00 (11 PM - midnight)
      // With 45-min post buffer, blocks until 00:45 Tuesday
      const bookings = generateBookings([
        {
          startTime: createDateAtTime(2025, 11, 24, 23, 0),
          endTime: createDateAtTime(2025, 11, 25, 0, 0),
        },
      ]);

      const blackoutDates: any[] = [];

      // Manually execute the pipeline
      const { startInTZ, endInTZ } = getTimeWindowInTimezone(settings);
      let candidateSlots = generateCandidateSlotsUTC(startInTZ, endInTZ, workingHours, settings);
      candidateSlots = filterSlotsByBlackoutDates(
        candidateSlots,
        blackoutDates,
        settings.workingTimezone,
      );
      const bufferedBookings = applyBufferTimes(bookings, settings);
      candidateSlots = filterCollidingSlots(candidateSlots, bufferedBookings);
      const finalSlots = applyBusinessRulesToSlots(candidateSlots, settings);

      // Tuesday 00:00-01:00 slot should be blocked (buffer goes to 00:45)
      const tuesdayMidnightSlot = finalSlots.find(
        (slot) => slot.startTimeUTC.day === 25 && slot.startTimeUTC.hour === 0,
      );
      expect(tuesdayMidnightSlot).toBeUndefined();

      // Tuesday 01:00-02:00 slot should be available
      const tuesdayOneAMSlot = finalSlots.find(
        (slot) => slot.startTimeUTC.day === 25 && slot.startTimeUTC.hour === 1,
      );
      expect(tuesdayOneAMSlot).toBeDefined();
    });

    it("should handle booking collision at exact slot boundaries (adjacent slots)", () => {
      // Mock DateTime.now() to Nov 24, 2025, 9 AM UTC (Monday)
      mockDateTimeNow(2025, 11, 24, 9, 0);

      const settings = generateOrganizerSettings({
        workingTimezone: "UTC",
        defaultMeetingDuration: 60,
        maxBookingAdvance: 2,
        minBookingNotice: 1,
        preBookingBuffer: 0, // No buffers to test exact boundaries
        postBookingBuffer: 0,
      });

      const workingHours = generateStandardWorkingHours();

      // Booking exactly 10:00-11:00
      const bookings = generateBookings([
        {
          startTime: createDateAtTime(2025, 11, 25, 10, 0),
          endTime: createDateAtTime(2025, 11, 25, 11, 0),
        },
      ]);

      const blackoutDates: any[] = [];

      // Manually execute the pipeline
      const { startInTZ, endInTZ } = getTimeWindowInTimezone(settings);
      let candidateSlots = generateCandidateSlotsUTC(startInTZ, endInTZ, workingHours, settings);
      candidateSlots = filterSlotsByBlackoutDates(
        candidateSlots,
        blackoutDates,
        settings.workingTimezone,
      );
      const bufferedBookings = applyBufferTimes(bookings, settings);
      candidateSlots = filterCollidingSlots(candidateSlots, bufferedBookings);
      const finalSlots = applyBusinessRulesToSlots(candidateSlots, settings);

      const tuesdaySlots = finalSlots.filter((slot) => slot.startTimeUTC.day === 25);
      const tuesdayHours = tuesdaySlots.map((slot) => slot.startTimeUTC.hour);

      // 9 AM slot (9:00-10:00) should be available (ends when booking starts)
      expect(tuesdayHours).toContain(9);

      // 10 AM slot should be blocked (exact collision)
      expect(tuesdayHours).not.toContain(10);

      // 11 AM slot (11:00-12:00) should be available (starts when booking ends)
      expect(tuesdayHours).toContain(11);
    });
  });
});
