'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
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

export default function BusyFacultyGrid() {
  const [busyFaculty, setBusyFaculty] = useState<BusyFacultyInfo[]>([]);
  const [freeFaculty, setFreeFaculty] = useState<FreeFacultyInfo[]>([]);
  const [allFaculty, setAllFaculty] = useState<Faculty[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Define time slots
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

  // Get day name
  const getDayName = (): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  // Get current time slot
  const getCurrentTimeSlot = (): { time: string; key: string } | null => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    for (const slot of timeSlots) {
      if (slot.key === 'break') continue; // Skip break slots
      
      const [startStr, endStr] = slot.time.split(' – ');
      let [startHour, startMin] = startStr.split(':').map(Number);
      let [endHour, endMin] = endStr.split(':').map(Number);

      // Handle PM times (times after 12:00 that appear as 01:xx, 02:xx, etc.)
      // If start hour is 12 or greater, it's already in correct format
      // If end hour is less than start hour, it's a PM time, so add 12
      if (startHour >= 12) {
        // Start is PM, check if end needs adjustment
        if (endHour < 12 && endHour < startHour) {
          endHour += 12;
        }
      } else if (startHour < 12 && endHour < startHour) {
        // This means we've crossed noon
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

  // Fetch timetables and find busy faculty
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'timetables'), (snapshot) => {
      const busyFacultyMap = new Map<string, BusyFacultyInfo>();
      const currentDay = getDayName();
      const currentTimeSlot = getCurrentTimeSlot();

      console.log('Current Day:', currentDay);
      console.log('Current Time Slot:', currentTimeSlot);

      if (!currentTimeSlot) {
        console.log('No current time slot found');
        setBusyFaculty([]);
        setCurrentTime('');
        return;
      }

      setCurrentTime(currentTimeSlot.time);

      snapshot.docs.forEach((timetableDoc) => {
        const data = timetableDoc.data();
        const assignments: Assignment[] = data.assignments || [];
        
        // Use stored fields from timetable data
        const semesterId = data.semesterId || '';
        const departmentId = data.departmentId || '';
        const division = data.division || '';
        
        const dept = departments.find(d => d.id === departmentId);
        const deptLetter = dept?.letter || departmentId?.charAt(0)?.toUpperCase() || '';
        const divisionString = `${semesterId}${deptLetter}${division}`;

        // Find assignments for current day and time slot
        assignments.forEach((assignment) => {
          if (
            assignment.day === currentDay &&
            assignment.timeSlot === currentTimeSlot.time &&
            assignment.faculty
          ) {
            const facultyId = assignment.faculty.id || assignment.faculty;
            const facultyShortName = assignment.faculty.shortName || '';
            const facultyName = assignment.faculty.name || '';
            
            // Try to get faculty info from the assignment first, then from allFaculty
            const facultyFromList = allFaculty.find(f => f.id === facultyId);
            
            busyFacultyMap.set(facultyId, {
              facultyId: facultyId,
              name: facultyName || facultyFromList?.name || '',
              shortName: facultyShortName || facultyFromList?.shortName || '',
              duration: currentTimeSlot.time,
              room: assignment.room?.roomNumber || assignment.room || 'N/A',
              division: divisionString
            });
          }
        });
      });

      console.log('Busy Faculty Found:', busyFacultyMap.size);
      setBusyFaculty(Array.from(busyFacultyMap.values()));

      // Calculate free faculty
      const busyFacultyIds = new Set(busyFacultyMap.keys());
      const freeFacultyList: FreeFacultyInfo[] = allFaculty
        .filter(f => !busyFacultyIds.has(f.id) && f.status === 'Active')
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
  }, [allFaculty]);

  return (
    <div className="space-y-8">
      {/* Busy Faculty Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Busy Faculty {currentTime && `(${currentTime})`}
          </h3>
          {busyFaculty.length === 0 && (
            <p className="text-sm text-gray-500 mt-1">No faculty teaching at this time</p>
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
