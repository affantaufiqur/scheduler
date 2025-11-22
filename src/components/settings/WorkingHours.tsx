import { useState } from "react";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface DaySchedule {
  day: string;
  enabled: boolean;
  slots: TimeSlot[];
}

export function WorkingHours() {
  const weekDays = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
  ];

  const initialSchedule: DaySchedule[] = weekDays.map((day) => ({
    day,
    enabled: day !== "Saturday" && day !== "Sunday", // Weekdays enabled by default
    slots: day !== "Saturday" && day !== "Sunday" 
      ? [{ id: "1", startTime: "09:00", endTime: "17:00" }]
      : [],
  }));

  const [schedule, setSchedule] = useState<DaySchedule[]>(initialSchedule);

  const toggleDayEnabled = (dayIndex: number) => {
    setSchedule((prev) => {
      const newSchedule = [...prev];
      const day = newSchedule[dayIndex];
      day.enabled = !day.enabled;
      
      if (!day.enabled) {
        day.slots = [];
      } else {
        day.slots = [{ id: Date.now().toString(), startTime: "09:00", endTime: "17:00" }];
      }
      
      return newSchedule;
    });
  };

  const addTimeSlot = (dayIndex: number) => {
    setSchedule((prev) => {
      const newSchedule = [...prev];
      const day = newSchedule[dayIndex];
      day.slots.push({
        id: Date.now().toString(),
        startTime: "09:00",
        endTime: "17:00",
      });
      return newSchedule;
    });
  };

  const removeTimeSlot = (dayIndex: number, slotId: string) => {
    setSchedule((prev) => {
      const newSchedule = [...prev];
      const day = newSchedule[dayIndex];
      day.slots = day.slots.filter((slot) => slot.id !== slotId);
      return newSchedule;
    });
  };

  const updateSlotTime = (dayIndex: number, slotId: string, field: "startTime" | "endTime", value: string) => {
    setSchedule((prev) => {
      const newSchedule = [...prev];
      const day = newSchedule[dayIndex];
      const slot = day.slots.find((s) => s.id === slotId);
      if (slot) {
        slot[field] = value;
      }
      return newSchedule;
    });
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Working Hours</h1>
        <p className="text-gray-600 mt-1">
          Set your weekly availability schedule. This UI is for demonstration purposes only - backend integration coming soon.
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> Working hours functionality is not yet connected to the backend. 
          This UI shows the intended design for future implementation.
        </p>
      </div>

      <div className="space-y-6">
        {schedule.map((daySchedule, dayIndex) => (
          <div key={daySchedule.day} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={daySchedule.enabled}
                    onChange={() => toggleDayEnabled(dayIndex)}
                    disabled
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-disabled:opacity-50 peer-disabled:cursor-not-allowed peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="ml-3 text-lg font-medium text-gray-900">{daySchedule.day}</span>
              </div>
              
              {daySchedule.enabled && (
                <button
                  onClick={() => addTimeSlot(dayIndex)}
                  disabled
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Add Time Slot
                </button>
              )}
            </div>

            {daySchedule.enabled && daySchedule.slots.length > 0 && (
              <div className="space-y-3">
                {daySchedule.slots.map((slot, slotIndex) => (
                  <div key={slot.id} className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">From:</label>
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateSlotTime(dayIndex, slot.id, "startTime", e.target.value)}
                        disabled
                        className="px-2 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">To:</label>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateSlotTime(dayIndex, slot.id, "endTime", e.target.value)}
                        disabled
                        className="px-2 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    {daySchedule.slots.length > 1 && (
                      <button
                        onClick={() => removeTimeSlot(dayIndex, slot.id)}
                        disabled
                        className="px-2 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {daySchedule.enabled && daySchedule.slots.length === 0 && (
              <p className="text-sm text-gray-500 italic">No time slots configured</p>
            )}

            {!daySchedule.enabled && (
              <p className="text-sm text-gray-500 italic">Not available on this day</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          disabled
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Working Hours
        </button>
      </div>
    </div>
  );
}
