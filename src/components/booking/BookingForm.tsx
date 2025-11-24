import { useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { DateTime } from "luxon";
import { createBooking } from "@/functions/booking/create-booking";
import { Input } from "@/components/Input";
import { Textarea } from "@/components/Textarea";
import { mapZodErrors, type FieldErrors } from "@/helpers/zodError";

interface Slot {
  startTime: string;
  endTime: string;
  duration: number;
  timezone: string;
}

interface OrganizerSettings {
  defaultMeetingDuration: number;
  workingTimezone: string;
}

interface BookingFormProps {
  username: string;
  slot: Slot;
  settings: OrganizerSettings;
  attendeeTimezone: string;
  onBookingSuccess: (booking: any) => void;
}

export function BookingForm({
  username,
  slot,
  settings,
  attendeeTimezone,
  onBookingSuccess,
}: BookingFormProps) {
  const navigate = useNavigate();
  const createBookingFn = useServerFn(createBooking);

  const [formData, setFormData] = useState({
    attendantName: "",
    attendantEmail: "",
    title: "",
    description: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [additionalAttendees, setAdditionalAttendees] = useState<string[]>([]);
  const [newAttendeeEmail, setNewAttendeeEmail] = useState("");
  const [attendeeEmailError, setAttendeeEmailError] = useState("");

  // Format times for display
  const startTime = DateTime.fromISO(slot.startTime, { zone: slot.timezone });
  const endTime = DateTime.fromISO(slot.endTime, { zone: slot.timezone });
  const attendeeStartTime = startTime.setZone(attendeeTimezone);
  const attendeeEndTime = endTime.setZone(attendeeTimezone);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      // Clear error for this field
      setFieldErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
      // Clear API error when user makes changes
      if (apiError) setApiError("");
    },
    [apiError],
  );

  const handleAddAttendee = useCallback(() => {
    setAttendeeEmailError("");

    if (!newAttendeeEmail.trim()) {
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAttendeeEmail)) {
      setAttendeeEmailError("Please enter a valid email address");
      return;
    }

    // Prevent adding the main attendee's email
    if (newAttendeeEmail.toLowerCase() === formData.attendantEmail.toLowerCase()) {
      setAttendeeEmailError("This is already the main attendee email");
      return;
    }

    // Prevent duplicates
    if (
      additionalAttendees.some((email) => email.toLowerCase() === newAttendeeEmail.toLowerCase())
    ) {
      setAttendeeEmailError("This email has already been added");
      return;
    }

    // limit to 10 additional attendees
    if (additionalAttendees.length >= 10) {
      setAttendeeEmailError("Maximum 10 additional attendees allowed");
      return;
    }

    setAdditionalAttendees((prev) => [...prev, newAttendeeEmail]);
    setNewAttendeeEmail("");
  }, [newAttendeeEmail, formData.attendantEmail, additionalAttendees]);

  const handleRemoveAttendee = useCallback((emailToRemove: string) => {
    setAdditionalAttendees((prev) => prev.filter((email) => email !== emailToRemove));
  }, []);

  const handleAttendeeEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewAttendeeEmail(e.target.value);
    setAttendeeEmailError("");
  }, []);

  const handleAttendeeEmailKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddAttendee();
      }
    },
    [handleAddAttendee],
  );

  const handleBack = useCallback(() => {
    navigate({ search: {} });
  }, [navigate]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setApiError("");

      try {
        const result = await createBookingFn({
          data: {
            organizerUsername: username,
            attendantName: formData.attendantName,
            attendantEmail: formData.attendantEmail,
            attendantTimezone: attendeeTimezone,
            title: formData.title,
            description: formData.description,
            startTime: slot.startTime,
            endTime: slot.endTime,
            metadata:
              additionalAttendees.length > 0
                ? { additional_attendees: additionalAttendees }
                : undefined,
          },
        });

        if (result.error) {
          if (result.error.includes("email")) {
            setFieldErrors({ attendantEmail: result.error });
          } else if (result.error.includes("name")) {
            setFieldErrors({ attendantName: result.error });
          } else if (result.error.includes("title")) {
            setFieldErrors({ title: result.error });
          } else {
            setApiError(result.error);
          }
          return;
        }

        if (result.success && result.booking) {
          onBookingSuccess(result.booking);
        } else {
          setApiError("Failed to create booking. Please try again.");
        }
      } catch (error) {
        console.error("Booking error:", error);
        setApiError("An unexpected error occurred. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [createBookingFn, username, formData, slot, onBookingSuccess, additionalAttendees],
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-6">
        <button
          onClick={handleBack}
          className="mb-4 text-sm text-gray-600 transition-colors hover:text-gray-900"
        >
          ← Back to availability
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Complete Your Booking</h2>

        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-medium text-gray-700">Meeting Details</h3>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <div>
              <span className="font-medium">Date:</span>{" "}
              {attendeeStartTime.toFormat("EEEE, MMMM d, yyyy")}
            </div>
            <div>
              <span className="font-medium">Time:</span> {attendeeStartTime.toFormat("h:mm a")} -{" "}
              {attendeeEndTime.toFormat("h:mm a")} ({attendeeTimezone}) (Your Local Time)
            </div>
            <div>
              <span className="font-medium">Duration:</span> {slot.duration} minutes
            </div>
            {attendeeTimezone !== slot.timezone && (
              <div className="mt-2 border-t border-gray-200 pt-2 text-xs text-gray-500">
                <div>
                  Organizer's time: {startTime.toFormat("h:mm a")} - {endTime.toFormat("h:mm a")} (
                  {slot.timezone})
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {apiError && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{apiError}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input.Root>
          <Input.Label htmlFor="attendantName">Your Name</Input.Label>
          <Input.Field
            type="text"
            id="attendantName"
            name="attendantName"
            value={formData.attendantName}
            onChange={handleChange}
            placeholder="John Doe"
            error={fieldErrors.attendantName}
            required
          />
          <Input.Error message={fieldErrors.attendantName} />
        </Input.Root>

        <Input.Root>
          <Input.Label htmlFor="attendantEmail">Your Email</Input.Label>
          <Input.Field
            type="email"
            id="attendantEmail"
            name="attendantEmail"
            value={formData.attendantEmail}
            onChange={handleChange}
            placeholder="you@example.com"
            error={fieldErrors.attendantEmail}
            required
          />
          <Input.Error message={fieldErrors.attendantEmail} />
        </Input.Root>

        <Input.Root>
          <Input.Label htmlFor="title">Meeting Title</Input.Label>
          <Input.Field
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Project Discussion"
            error={fieldErrors.title}
            required
          />
          <Input.Error message={fieldErrors.title} />
        </Input.Root>

        <Textarea.Root>
          <Textarea.Label htmlFor="description">Description (Optional)</Textarea.Label>
          <Textarea.Field
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Brief description of what you'd like to discuss..."
            rows={3}
          />
          <Textarea.Hint>Add any additional information for the organizer</Textarea.Hint>
        </Textarea.Root>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Additional Attendees (Optional)
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input.Field
                type="email"
                value={newAttendeeEmail}
                onChange={handleAttendeeEmailChange}
                onKeyDown={handleAttendeeEmailKeyDown}
                placeholder="colleague@example.com"
                error={attendeeEmailError}
              />
              {attendeeEmailError && (
                <p className="mt-1 text-sm text-red-600">{attendeeEmailError}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleAddAttendee}
              className="h-8 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!newAttendeeEmail.trim() || isSubmitting}
            >
              Add
            </button>
          </div>

          {additionalAttendees.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-500">
                {additionalAttendees.length} additional{" "}
                {additionalAttendees.length === 1 ? "attendee" : "attendees"}
              </p>
              <ul className="space-y-1">
                {additionalAttendees.map((email) => (
                  <li
                    key={email}
                    className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <span className="text-sm text-gray-700">{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttendee(email)}
                      className="ml-2 text-red-600 transition-colors hover:text-red-800 focus:outline-none"
                      disabled={isSubmitting}
                      aria-label={`Remove ${email}`}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-gray-500">
            These attendees will also receive the meeting invitation
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Booking..." : "Confirm Booking"}
          </button>
        </div>
      </form>
    </div>
  );
}
