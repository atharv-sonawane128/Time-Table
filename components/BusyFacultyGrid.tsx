'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card } from '@/components/ui/card';
import { departments } from '@/lib/data';

interface Faculty {
  id: string;
  name: string;
  shortName: string;
  email: string;
  misId: string;
  phone?: string;
  department: string;
  designation: string;
  subjects: string[];
  maxLecturesPerWeek: number;
  availableDays: string[];
  preferredTimeSlots: string[];
  status: 'Active' | 'Inactive';
  role: 'Faculty' | 'HOD' | 'Admin';
  facultyId: string;
}

interface Assignment {
  subject: any;
  faculty: any;
  room: any;
  timeSlot: string;
  day: string;
}

interface BusyFacultyInfo {
  facultyId: string;
  name: string;
  shortName: string;
  duration: string;
  room: string;
  division: string;
}

interface FreeFacultyInfo {
  id: string;
  name: string;
  shortName: string;
  status: 'Active' | 'Inactive';
}

const TIME_SLOTS = [
  { time: '07:30 – 08:25', key: '0', start: 450, end: 505 },
  { time: '08:25 – 09:20', key: '1', start: 505, end: 560 },
  { time: '09:20 – 09:30', key: 'break', start: 560, end: 570 },
  { time: '09:30 – 10:25', key: '2', start: 570, end: 625 },
  { time: '10:25 – 11:20', key: '3', start: 625, end: 680 },
  { time: '11:20 – 12:20', key: 'break', start: 680, end: 740 },
  { time: '12:20 – 01:15', key: '4', start: 740, end: 795 },
  { time: '01:15 – 02:10', key: '5', start: 795, end: 850 },
  { time: '02:10 – 02:30', key: 'break', start: 850, end: 870 },
  { time: '02:30 – 03:25', key: '6', start: 870, end: 925 },
  { time: '03:25 – 04:20', key: '7', start: 925, end: 980 },
] as const;

function normalizeSlotString(slot: string): string {
  return String(slot || '')
    .replace(/\s+/g, '')
    .replace(/-/g, '–')
    .replace(/(^|[–])0(?=\d:)/g, '$1');
}

export default function BusyFacultyGrid() {
  const [busyFaculty, setBusyFaculty] = useState<BusyFacultyInfo[]>([]);
  const [freeFaculty, setFreeFaculty] = useState<FreeFacultyInfo[]>([]);
  const [allFaculty, setAllFaculty] = useState<Faculty[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [activeDay, setActiveDay] = useState<string>(() => getDayName());
  const [activeSlot, setActiveSlot] = useState<string>(() => getCurrentTimeSlot()?.time || '');

  // Get day name
  function getDayName(): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  }

  // Get current time slot
  function getCurrentTimeSlot(): { time: string; key: string } | null {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const slot of TIME_SLOTS) {
      if (slot.key === 'break') continue; // Skip break slots

      if (currentMinutes >= slot.start && currentMinutes < slot.end) {
        return slot;
      }
    }
    return null;
  }

  // Fetch all faculty
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'faculty'), (snapshot) => {
      const facultyList: Faculty[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        facultyList.push({
          id: doc.id,
          name: data.name || '',
          shortName: data.shortName || '',
          email: data.email || '',
          misId: data.misId || '',
          phone: data.phone || '',
          department: data.department || '',
          designation: data.designation || 'Assistant Professor',
          subjects: Array.isArray(data.subjects) ? data.subjects : [],
          maxLecturesPerWeek: data.maxLecturesPerWeek || 20,
          availableDays: Array.isArray(data.availableDays) ? data.availableDays : [],
          preferredTimeSlots: Array.isArray(data.preferredTimeSlots) ? data.preferredTimeSlots : [],
          status: data.status || 'Active',
          role: data.role || 'Faculty',
          facultyId: data.facultyId || doc.id
        } as Faculty);
      });
      setAllFaculty(facultyList);
    });
    return () => unsubscribe();
  }, []);

  // Keep active day/slot aligned with real time.
  useEffect(() => {
    const syncCurrentSlot = () => {
      setActiveDay(getDayName());
      setActiveSlot(getCurrentTimeSlot()?.time || '');
    };

    syncCurrentSlot();
    const interval = setInterval(syncCurrentSlot, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch timetables and find busy faculty
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'timetables'), (snapshot) => {
      const busyFacultyMap = new Map<string, BusyFacultyInfo>();
      setCurrentTime(activeSlot);

      if (!activeSlot) {
        setBusyFaculty([]);

        const freeFacultyOutsideSlot: FreeFacultyInfo[] = allFaculty
          .filter(f => f.status === 'Active')
          .map(f => ({
            id: f.id,
            name: f.name,
            shortName: f.shortName,
            status: f.status,
          }));

        setFreeFaculty(freeFacultyOutsideSlot);
        return;
      }

      snapshot.docs.forEach((timetableDoc) => {
        const data = timetableDoc.data();
        const assignments: Assignment[] = data.assignments || [];

        const [semesterId, departmentId, divisionNum] = String(timetableDoc.id).split('_');
        const dept = departments.find(d => d.id === departmentId);
        const deptLetter = dept?.letter || String(departmentId || '').charAt(0).toUpperCase();
        const divisionString = `${semesterId || ''}${deptLetter || ''}${divisionNum || data.division || ''}`;

        // Find assignments for selected day and time slot
        assignments.forEach((assignment) => {
          const assignmentSlot = normalizeSlotString(assignment.timeSlot);
          const activeSlotKey = normalizeSlotString(activeSlot);

          if (
            assignment.day === activeDay &&
            assignmentSlot === activeSlotKey &&
            assignment.faculty
          ) {
            const rawFacultyId = String(assignment.faculty.id || assignment.faculty.facultyId || assignment.faculty || '');
            const facultyShortName = assignment.faculty.shortName || '';
            const facultyName = assignment.faculty.name || '';
            
            // Normalize faculty identity between id and facultyId.
            const facultyFromList = allFaculty.find(
              f => f.id === rawFacultyId || f.facultyId === rawFacultyId
            );
            const normalizedId = facultyFromList?.id || rawFacultyId;
            
            busyFacultyMap.set(normalizedId, {
              facultyId: normalizedId,
              name: facultyName || facultyFromList?.name || '',
              shortName: facultyShortName || facultyFromList?.shortName || '',
              duration: activeSlot,
              room: assignment.room?.roomNumber || assignment.room || 'N/A',
              division: divisionString
            });
          }
        });
      });

      console.log('Busy Faculty Found:', busyFacultyMap.size);
      setBusyFaculty(Array.from(busyFacultyMap.values()));

      // Calculate free faculty
      const busyFacultyIds = new Set<string>();
      busyFacultyMap.forEach((_, id) => {
        busyFacultyIds.add(id);
        const fac = allFaculty.find(f => f.id === id);
        if (fac?.facultyId) {
          busyFacultyIds.add(fac.facultyId);
        }
      });

      const freeFacultyList: FreeFacultyInfo[] = allFaculty
        .filter(f => !busyFacultyIds.has(f.id) && !busyFacultyIds.has(f.facultyId) && f.status === 'Active')
        .map(f => ({
          id: f.id,
          name: f.name,
          shortName: f.shortName,
          status: f.status
        }));

      console.log('Free Faculty Found:', freeFacultyList.length);
      setFreeFaculty(freeFacultyList);
    });

    return () => unsubscribe();
  }, [allFaculty, activeDay, activeSlot]);

  return (
    <div className="space-y-8">
      {/* Busy Faculty Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Busy Faculty {currentTime ? `(${activeDay} | ${currentTime})` : '(No active lecture slot)'}
          </h3>
          {busyFaculty.length === 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {currentTime ? 'No faculty teaching at this time' : 'Currently break/non-teaching period'}
            </p>
          )}
        </div>

        {busyFaculty.length > 0 && (
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {busyFaculty.map((faculty) => (
                <Card key={faculty.facultyId} className="p-2 border border-orange-200 bg-orange-50">
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{faculty.name}({faculty.shortName})</p>
                    <p className="text-sm text-gray-900">Duration: {faculty.duration}</p>
                    <p className="text-sm text-gray-900">Room: {faculty.room}</p>
                    <p className="text-sm font-bold text-blue-600">Division: {faculty.division}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Free Faculty Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Free Faculty ({freeFaculty.length})
          </h3>
          {freeFaculty.length === 0 && (
            <p className="text-sm text-gray-500 mt-1">All faculty are currently busy</p>
          )}
        </div>

        {freeFaculty.length > 0 && (
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {freeFaculty.map((faculty) => (
                <Card
                  key={faculty.id}
                  className="p-3 text-center border border-green-200 bg-green-50 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-900">{faculty.shortName}</p>
                    <p className="text-xs text-gray-600">{faculty.name}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
