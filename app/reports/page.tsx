'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

import Sidebar from '../../components/sidebar';
import Header from '../../components/header';
import SummaryCard from '../../components/summary-card';
import MasterCard from '../../components/master-card';

interface SummaryStat {
  title: string;
  count: number;
  icon: string;
}

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [masterStats] = useState([
    { title: 'Faculty Master', icon: 'Users', href: '/reports/faculty-master' },
    { title: 'Lecture Master', icon: 'BookOpen', href: '/reports/lecture-master' },
    { title: 'Lab Master', icon: 'MapPin', href: '/reports/lab-master' },
  ]);
  const [availabilityStats, setAvailabilityStats] = useState<SummaryStat[]>([
    { title: 'Faculties Available', count: 0, icon: 'UserCheck' },
    { title: 'Rooms Occupied', count: 0, icon: 'MapPin' },
    { title: 'Rooms Available', count: 0, icon: 'MapPin' },
    { title: 'Busy Faculties', count: 0, icon: 'UserX' },
  ]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch runtime availability data
  useEffect(() => {
    // Get current date and time
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }); // e.g., "Monday"
    const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

    // Define time slots for both shifts
    const morningSlots = [
      { time: '07:30 – 08:25', start: 7*60 + 30, end: 8*60 + 25 },
      { time: '08:25 – 09:20', start: 8*60 + 25, end: 9*60 + 20 },
      { time: '09:20 – 09:30', start: 9*60 + 20, end: 9*60 + 30 },
      { time: '09:30 – 10:25', start: 9*60 + 30, end: 10*60 + 25 },
      { time: '10:25 – 11:20', start: 10*60 + 25, end: 11*60 + 20 },
      { time: '11:20 – 12:20', start: 11*60 + 20, end: 12*60 + 20 },
      { time: '12:20 – 01:15', start: 12*60 + 20, end: 13*60 + 15 },
      { time: '01:15 – 02:10', start: 13*60 + 15, end: 14*60 + 10 },
    ];

    const generalSlots = [
      { time: '09:30 – 10:25', start: 9*60 + 30, end: 10*60 + 25 },
      { time: '10:25 – 11:20', start: 10*60 + 25, end: 11*60 + 20 },
      { time: '11:20 – 12:20', start: 11*60 + 20, end: 12*60 + 20 },
      { time: '12:20 – 01:15', start: 12*60 + 20, end: 13*60 + 15 },
      { time: '01:15 – 02:10', start: 13*60 + 15, end: 14*60 + 10 },
      { time: '02:10 – 02:30', start: 14*60 + 10, end: 14*60 + 30 },
      { time: '02:30 – 03:25', start: 14*60 + 30, end: 15*60 + 25 },
      { time: '03:25 – 04:20', start: 15*60 + 25, end: 16*60 + 20 },
    ];

    // Find current time slot from either shift
    const currentSlot = [...morningSlots, ...generalSlots].find(slot =>
      currentTime >= slot.start && currentTime <= slot.end
    )?.time;

    // For demo purposes, if no current slot, show data for the first slot of the day
    const demoSlot = currentSlot || morningSlots[0].time;
    const demoDay = currentDay;

    // Listen to timetable changes
    const unsubscribeTimetables = onSnapshot(collection(db, 'timetables'), (querySnapshot) => {
      const assignments: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.assignments && Array.isArray(data.assignments)) {
          // Get assignments for the current day and current time slot only
          assignments.push(...data.assignments.filter((assignment: any) =>
            assignment.day === demoDay && assignment.timeSlot === demoSlot
          ));
        }
      });

      // Get occupied faculty IDs (currently occupied in this time slot)
      const occupiedFacultyIds = new Set(assignments.map(a => a.faculty?.facultyId).filter(id => id));
      // Get occupied room IDs (currently occupied in this time slot)
      const occupiedRoomIds = new Set(assignments.map(a => a.room?.roomId).filter(id => id));

      // Listen to faculty changes
      const unsubscribeFaculty = onSnapshot(collection(db, 'faculty'), (facultySnapshot) => {
        const totalFaculties = facultySnapshot.size;
        const busyFaculties = occupiedFacultyIds.size;
        const availableFaculties = Math.max(0, totalFaculties - busyFaculties);

        // Listen to room changes
        const unsubscribeRooms = onSnapshot(collection(db, 'rooms'), (roomSnapshot) => {
          const totalRooms = roomSnapshot.size;
          const occupiedRooms = occupiedRoomIds.size;
          const availableRooms = Math.max(0, totalRooms - occupiedRooms);

          setAvailabilityStats([
            { title: 'Faculties Available', count: availableFaculties, icon: 'UserCheck' },
            { title: 'Rooms Occupied', count: occupiedRooms, icon: 'MapPin' },
            { title: 'Rooms Available', count: availableRooms, icon: 'MapPin' },
            { title: 'Busy Faculties', count: busyFaculties, icon: 'UserX' },
          ]);
        });

        return unsubscribeRooms;
      });

      return unsubscribeFaculty;
    });

    const updateAvailability = () => {
      // Get current date and time
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }); // e.g., "Monday"
      const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

      // Define time slots for both shifts
      const morningSlots = [
        { time: '07:30 – 08:25', start: 7*60 + 30, end: 8*60 + 25 },
        { time: '08:25 – 09:20', start: 8*60 + 25, end: 9*60 + 20 },
        { time: '09:20 – 09:30', start: 9*60 + 20, end: 9*60 + 30 },
        { time: '09:30 – 10:25', start: 9*60 + 30, end: 10*60 + 25 },
        { time: '10:25 – 11:20', start: 10*60 + 25, end: 11*60 + 20 },
        { time: '11:20 – 12:20', start: 11*60 + 20, end: 12*60 + 20 },
        { time: '12:20 – 01:15', start: 12*60 + 20, end: 13*60 + 15 },
        { time: '01:15 – 02:10', start: 13*60 + 15, end: 14*60 + 10 },
      ];

      const generalSlots = [
        { time: '09:30 – 10:25', start: 9*60 + 30, end: 10*60 + 25 },
        { time: '10:25 – 11:20', start: 10*60 + 25, end: 11*60 + 20 },
        { time: '11:20 – 12:20', start: 11*60 + 20, end: 12*60 + 20 },
        { time: '12:20 – 01:15', start: 12*60 + 20, end: 13*60 + 15 },
        { time: '01:15 – 02:10', start: 13*60 + 15, end: 14*60 + 10 },
        { time: '02:10 – 02:30', start: 14*60 + 10, end: 14*60 + 30 },
        { time: '02:30 – 03:25', start: 14*60 + 30, end: 15*60 + 25 },
        { time: '03:25 – 04:20', start: 15*60 + 25, end: 16*60 + 20 },
      ];

      // Find current time slot from either shift
      const currentSlot = [...morningSlots, ...generalSlots].find(slot =>
        currentTime >= slot.start && currentTime <= slot.end
      )?.time;

      // For demo purposes, if no current slot, show data for the first slot of the day
      const demoSlot = currentSlot || morningSlots[0].time;
      const demoDay = currentDay;

      // Listen to timetable changes
      const unsubscribeTimetables = onSnapshot(collection(db, 'timetables'), (querySnapshot) => {
        const assignments: any[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.assignments && Array.isArray(data.assignments)) {
            // Get assignments for the current day and current time slot only
            assignments.push(...data.assignments.filter((assignment: any) =>
              assignment.day === demoDay && assignment.timeSlot === demoSlot
            ));
          }
        });

        // Get occupied faculty IDs (currently occupied in this time slot)
        const occupiedFacultyIds = new Set(assignments.map(a => a.faculty?.facultyId).filter(id => id));
        // Get occupied room IDs (currently occupied in this time slot)
        const occupiedRoomIds = new Set(assignments.map(a => a.room?.roomId).filter(id => id));

        // Listen to faculty changes
        const unsubscribeFaculty = onSnapshot(collection(db, 'faculty'), (facultySnapshot) => {
          const totalFaculties = facultySnapshot.size;
          const busyFaculties = occupiedFacultyIds.size;
          const availableFaculties = Math.max(0, totalFaculties - busyFaculties);

          // Listen to room changes
          const unsubscribeRooms = onSnapshot(collection(db, 'rooms'), (roomSnapshot) => {
            const totalRooms = roomSnapshot.size;
            const occupiedRooms = occupiedRoomIds.size;
            const availableRooms = Math.max(0, totalRooms - occupiedRooms);

            setAvailabilityStats([
              { title: 'Faculties Available', count: availableFaculties, icon: 'UserCheck' },
              { title: 'Rooms Occupied', count: occupiedRooms, icon: 'MapPin' },
              { title: 'Rooms Available', count: availableRooms, icon: 'MapPin' },
              { title: 'Busy Faculties', count: busyFaculties, icon: 'UserX' },
            ]);
          });

          return unsubscribeRooms;
        });

        return unsubscribeFaculty;
      });

      return unsubscribeTimetables;
    };

    // Initial call
    const cleanup = updateAvailability();

    // Update every minute to reflect current time changes
    const interval = setInterval(() => {
      cleanup?.(); // Clean up previous listeners
      updateAvailability();
    }, 60000); // Update every minute

    return () => {
      cleanup?.();
      clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <div className="flex-1 ml-64">
        <Header user={user} onLogout={handleLogout} />
        <main className="p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reports</h2>
            <p className="text-gray-600">View summary reports and statistics</p>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Masters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {masterStats.map((stat, index) => (
                <MasterCard key={index} title={stat.title} icon={stat.icon} href={stat.href} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Availability</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {availabilityStats.map((stat, index) => (
                <SummaryCard key={index} title={stat.title} count={stat.count} icon={stat.icon} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
