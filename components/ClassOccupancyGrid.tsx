'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { departments } from '@/lib/data';
import { Card } from '@/components/ui/card';

interface Assignment {
  subject: {
    subjectShortName?: string;
    subjectCode?: string;
  };
  faculty: {
    shortName?: string;
    name?: string;
  };
  room: {
    roomNumber?: string;
  };
  timeSlot: string;
  day: string;
}

interface TimetableClass {
  classCode: string;
  assignments: Assignment[];
}

interface OccupiedClassInfo {
  classCode: string;
  subject: string;
  faculty: string;
  room: string;
}

const timeSlots = [
  { time: '07:30 – 08:25', key: '0' },
  { time: '08:25 – 09:20', key: '1' },
  { time: '09:20 – 09:30', key: 'break' },
  { time: '09:30 – 10:25', key: '2' },
  { time: '10:25 – 11:20', key: '3' },
  { time: '11:20 – 12:20', key: 'break' },
  { time: '12:20 – 01:15', key: '4' },
  { time: '01:15 – 02:10', key: '5' },
  { time: '02:10 – 02:30', key: 'break' },
  { time: '02:30 – 03:25', key: '6' },
  { time: '03:25 – 04:20', key: '7' },
];

const getCurrentDayName = (): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
};

const getCurrentTimeSlot = (): { time: string; key: string } | null => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const slot of timeSlots) {
    if (slot.key === 'break') continue;

    const [startStr, endStr] = slot.time.split(' – ');
    const [startHourRaw, startMin] = startStr.split(':').map(Number);
    const [endHourRaw, endMin] = endStr.split(':').map(Number);

    let startHour = startHourRaw;
    let endHour = endHourRaw;

    if (startHour >= 12) {
      if (endHour < 12 && endHour < startHour) {
        endHour += 12;
      }
    } else if (startHour < 12 && endHour < startHour) {
      endHour += 12;
    }

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (currentMinutes >= startTime && currentMinutes < endTime) {
      return slot;
    }
  }

  return null;
};

export default function ClassOccupancyGrid() {
  const [classes, setClasses] = useState<TimetableClass[]>([]);
  const [occupiedClasses, setOccupiedClasses] = useState<OccupiedClassInfo[]>([]);
  const [freeClasses, setFreeClasses] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const teachingSlots = timeSlots.filter(slot => slot.key !== 'break').map(slot => slot.time);
  const detectedDay = getCurrentDayName();
  const detectedSlot = getCurrentTimeSlot();
  const [selectedDay, setSelectedDay] = useState<string>(
    weekDays.includes(detectedDay) ? detectedDay : 'Monday'
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(
    detectedSlot?.time || teachingSlots[0]
  );

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'timetables'), (snapshot) => {
      const classList: TimetableClass[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const assignments = Array.isArray(data.assignments) ? data.assignments : [];

        const timetableId = doc.id;
        const [semesterId, departmentId, divisionNumber] = String(timetableId).split('_');
        const department = departments.find((d) => d.id === departmentId);
        const departmentLetter = department?.letter || String(departmentId || '').charAt(0).toUpperCase();
        const classCode = `${semesterId || ''}${departmentLetter || ''}${divisionNumber || data.division || ''}`;

        if (classCode) {
          classList.push({ classCode, assignments });
        }
      });

      setClasses(classList);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const updateClassStatus = () => {
      setCurrentTime(selectedTimeSlot);

      const occupied: OccupiedClassInfo[] = [];
      const free: string[] = [];

      classes.forEach((classItem) => {
        const assignment = classItem.assignments.find(
          (a) => a.day === selectedDay && a.timeSlot === selectedTimeSlot
        );

        if (assignment) {
          occupied.push({
            classCode: classItem.classCode,
            subject: assignment.subject?.subjectShortName || assignment.subject?.subjectCode || 'N/A',
            faculty: assignment.faculty?.shortName || assignment.faculty?.name || 'N/A',
            room: assignment.room?.roomNumber || 'N/A',
          });
        } else {
          free.push(classItem.classCode);
        }
      });

      setOccupiedClasses(occupied);
      setFreeClasses(free);
    };

    updateClassStatus();
  }, [classes, selectedDay, selectedTimeSlot]);

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <label htmlFor="class-day" className="text-sm text-gray-700">Day</label>
              <select
                id="class-day"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
              >
                {weekDays.map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="class-slot" className="text-sm text-gray-700">Slot</label>
              <select
                id="class-slot"
                value={selectedTimeSlot}
                onChange={(e) => setSelectedTimeSlot(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
              >
                {teachingSlots.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Occupied Classes ({selectedDay} | {currentTime})
          </h3>
          {occupiedClasses.length === 0 && (
            <p className="text-sm text-gray-500 mt-1">No classes are occupied in this selected slot</p>
          )}
        </div>
        {occupiedClasses.length > 0 && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {occupiedClasses.map((item) => (
                <Card key={item.classCode} className="p-4 border border-orange-200 bg-orange-50">
                  <div className="space-y-1 text-sm">
                    <p className="font-bold text-gray-900">{item.classCode}</p>
                    <p className="text-gray-700">Subject: {item.subject}</p>
                    <p className="text-gray-700">Faculty: {item.faculty}</p>
                    <p className="text-gray-700">Room: {item.room}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Free Classes ({freeClasses.length})</h3>
          {freeClasses.length === 0 && (
            <p className="text-sm text-gray-500 mt-1">All classes are currently occupied</p>
          )}
        </div>
        {freeClasses.length > 0 && (
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {freeClasses.map((classCode) => (
                <Card
                  key={classCode}
                  className="p-3 text-center border border-green-200 bg-green-50 hover:shadow-md transition-shadow"
                >
                  <p className="text-sm font-bold text-gray-900">{classCode}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
