'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, db } from '../../../lib/firebase';
import { ArrowLeft } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { Button } from '../../../components/ui/button';
import { departments } from '../../../lib/data';

import Sidebar from '../../../components/sidebar';
import Header from '../../../components/header';

interface Room {
  id: string;
  roomNumber: string;
  capacity: number;
  department: string;
  floor: number;
  allocatedDevices: string[];
  hasSmartBoard: boolean;
  status: 'Available' | 'Occupied' | 'Under Maintenance';
  roomId: string;
}

interface Assignment {
  subject: {
    subjectShortName: string;
    subjectCode: string;
  };
  faculty: {
    id: string;
    shortName: string;
  };
  room: {
    roomNumber: string;
  };
  timeSlot: string;
  day: string;
  division: string;
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeSlots = [
  '07:30 – 08:25', '08:25 – 09:20', '09:30 – 10:25', '10:25 – 11:20',
  '12:20 – 01:15', '01:15 – 02:10', '02:30 – 03:25', '03:25 – 04:20'
];

export default function LectureMasterPage() {
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
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

  useEffect(() => {
    if (!user) return;

    // Fetch rooms
    const roomsUnsubscribe = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Room[];
      setRooms(roomsData);
    });

    // Fetch all assignments from all timetables
    const timetablesUnsubscribe = onSnapshot(collection(db, 'timetables'), (snapshot) => {
      const allAssignments: Assignment[] = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const timetableId = doc.id; // Format: semesterId_departmentId_division
        const [semesterId, departmentId, divisionNum] = timetableId.split('_');
        const department = departments.find((d) => d.id === departmentId);
        const departmentLetter = department?.letter || '';
        const fullDivision = semesterId && divisionNum
          ? `${semesterId}${departmentLetter}${divisionNum}`
          : String(data.division || '');

        if (data.assignments) {
          const assignmentsWithDivision = data.assignments.map((assignment: any) => ({
            ...assignment,
            division: fullDivision,
          }));
          allAssignments.push(...assignmentsWithDivision);
        }
      });
      setAssignments(allAssignments);
    });

    return () => {
      roomsUnsubscribe();
      timetablesUnsubscribe();
    };
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleBack = () => {
    router.push('/reports');
  };

  const handleCellClick = (roomId: string, timeSlot: string, day: string) => {
    console.log(`Clicked: Room ${roomId}, Time ${timeSlot}, Day ${day}`);
    // Placeholder for future functionality
  };

  const formatDivision = (division: string) => {
    return division || '';
  };

  const handleExportExcel = () => {
    if (rooms.length === 0) {
      alert('No room data available to export.');
      return;
    }

    const sortedRooms = [...rooms].sort((a, b) => {
      const numA = parseInt(a.roomNumber.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.roomNumber.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    const columns = days.flatMap(day => timeSlots.map(slot => ({ day, slot })));
    const exportRows = sortedRooms.map((room) => {
      const row: Record<string, string> = {
        Room: `${room.roomNumber} (${room.department})`,
      };

      columns.forEach(({ day, slot }) => {
        const assignment = assignments.find(
          a => a.room.roomNumber === room.roomNumber && a.day === day && a.timeSlot === slot
        );

        row[`${day} ${slot}`] = assignment
          ? `${assignment.subject.subjectShortName || assignment.subject.subjectCode} (${assignment.faculty.shortName}) ${formatDivision(assignment.division)}`
          : 'Free';
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lecture Master');
    XLSX.writeFile(workbook, `lecture-master-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <div className="ml-64 w-[calc(100%-16rem)] min-w-0 overflow-x-hidden">
        <Header user={user} onLogout={handleLogout} />
        <main className="p-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Reports
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Lecture Master</h2>
            <p className="text-gray-600">Manage lecture information and details</p>
            </div>
            <Button onClick={handleExportExcel} disabled={rooms.length === 0}>
              Export Excel
            </Button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="relative isolate overflow-x-auto overflow-y-auto max-h-[40rem]">
              <table className="w-full border-collapse min-w-max">
                <thead className="bg-gray-50 sticky top-0 z-20">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[200px] sticky left-0 bg-gray-50 z-30 shadow-[2px_0_0_0_rgba(229,231,235,1)]">
                      Room
                    </th>
                    {days.flatMap(day =>
                      timeSlots.map(slot => ({ day, slot }))
                    ).map(({ day, slot }) => (
                      <th
                        key={`${day}-${slot}`}
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0 min-w-[120px]"
                      >
                        <div>{day}</div>
                        <div className="text-xs">{slot}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {rooms
                    .sort((a, b) => {
                      const numA = parseInt(a.roomNumber.replace(/\D/g, '')) || 0;
                      const numB = parseInt(b.roomNumber.replace(/\D/g, '')) || 0;
                      return numA - numB;
                    })
                    .map((room) => (
                    <tr key={room.id} className="border-b border-gray-200 last:border-b-0">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200 min-w-[200px] sticky left-0 z-10 shadow-[2px_0_0_0_rgba(229,231,235,1)]">
                        {room.roomNumber} ({room.department})
                      </td>
                      {days.flatMap(day =>
                        timeSlots.map(slot => ({ day, slot }))
                      ).map(({ day, slot }) => {
                        const assignment = assignments.find(
                          a => a.room.roomNumber === room.roomNumber && a.day === day && a.timeSlot === slot
                        );
                        return (
                          <td
                            key={`${day}-${slot}`}
                            className={`px-4 py-3 text-center text-sm text-gray-900 border-r border-gray-200 last:border-r-0 min-w-[120px] max-w-[160px] align-top cursor-pointer transition-colors ${
                              assignment ? 'bg-blue-50' : 'bg-green-50 italic text-gray-600'
                            }`}
                            onClick={() => handleCellClick(room.id, slot, day)}
                          >
                            {assignment ? (
                              <div className="leading-tight whitespace-normal break-words">
                                <div className="font-medium text-xs">
                                  {formatDivision(assignment.division)} : {assignment.subject.subjectShortName || assignment.subject.subjectCode}
                                </div>
                                <div className="text-gray-600 text-xs">({assignment.faculty.shortName})</div>
                              </div>
                            ) : (
                              'Free'
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
