'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, db } from '../../../lib/firebase';
import { ArrowLeft } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';

import Sidebar from '../../../components/sidebar';
import Header from '../../../components/header';

interface Faculty {
  id: string;
  name: string;
  shortName: string;
  facultyId: string;
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
  timetableId?: string;
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeSlots = [
  '07:30 – 08:25', '08:25 – 09:20', '09:30 – 10:25', '10:25 – 11:20',
  '12:20 – 01:15', '01:15 – 02:10', '02:30 – 03:25', '03:25 – 04:20'
];

export default function FacultyMasterPage() {
  const [user, setUser] = useState<User | null>(null);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
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

    // Fetch faculty
    const facultyUnsubscribe = onSnapshot(collection(db, 'faculty'), (snapshot) => {
      const facultyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Faculty[];
      setFaculty(facultyData);
    });

    // Fetch all assignments from all timetables
    const timetablesUnsubscribe = onSnapshot(collection(db, 'timetables'), (snapshot) => {
      const allAssignments: Assignment[] = [];
      const { departments } = require('../../../lib/data');
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const timetableId = doc.id; // Format: semesterId_departmentId_division
        const [semesterId, departmentId, division] = timetableId.split('_');
        const dept = departments.find((d: any) => d.id === departmentId);
        const deptLetter = dept?.letter || '';
        const divisionString = `${semesterId}${deptLetter}${division}`;
        
        if (data.assignments) {
          const assignmentsWithDivision = data.assignments.map((assignment: any) => ({
            ...assignment,
            division: divisionString,
            timetableId: timetableId,
          }));
          allAssignments.push(...assignmentsWithDivision);
        }
      });
      setAssignments(allAssignments);
    });

    return () => {
      facultyUnsubscribe();
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

  const handleCellClick = (facultyId: string, timeSlot: string, day: string) => {
    console.log(`Clicked: Faculty ${facultyId}, Time ${timeSlot}, Day ${day}`);
    // Placeholder for future functionality
  };

  const formatDivision = (division: string) => {
    if (!division || division.length < 3) return division;
    const semester = division[0];
    const department = division[1];
    const div = division[2];
    return `${semester}-${department}-${div}`;
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
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Reports
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Faculty Master</h2>
            <p className="text-gray-600">View faculty assignments across all timetables</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[40rem]">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[200px] sticky left-0 bg-gray-50">
                      Faculty
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
                  {faculty.map((fac) => (
                    <tr key={fac.id} className="border-b border-gray-200 last:border-b-0">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200 min-w-[200px] sticky left-0">
                        {fac.name} ({fac.shortName})
                      </td>
                      {days.flatMap(day =>
                        timeSlots.map(slot => ({ day, slot }))
                      ).map(({ day, slot }) => {
                        const assignment = assignments.find(
                          a => a.faculty.id === fac.id && a.day === day && a.timeSlot === slot
                        );
                        return (
                          <td
                            key={`${day}-${slot}`}
                            className={`px-4 py-3 text-center text-sm text-gray-900 border-r border-gray-200 last:border-r-0 min-w-[120px] cursor-pointer transition-colors ${
                              assignment ? 'bg-blue-50' : 'bg-green-50 italic text-gray-600'
                            }`}
                            onClick={() => handleCellClick(fac.id, slot, day)}
                          >
                            {assignment ? (
                              <div className="text-xs">
                                {assignment.division} {assignment.faculty.shortName}({assignment.subject.subjectShortName || assignment.subject.subjectCode}) {assignment.room.roomNumber}
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
