import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { departments } from '@/lib/data';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const timeSlots = [
  '7:30 – 9:30',
  '9:45 – 11:45',
  '12:45 – 2:25',
  '2:45 – 4:45',
];

interface Faculty {
  id: string;
  name: string;
  shortName: string;
  facultyId: string;
  title?: string;
}

interface Assignment {
  subject: {
    subjectShortName: string;
    subjectCode: string;
    subjectType?: string;
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

const FacultyMasterGrid: React.FC = () => {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.assignments) {
          // Get semesterId, departmentId, and division from timetable data
          const semesterId = data.semesterId || '';
          const departmentId = data.departmentId || '';
          const divisionNum = data.division || '';
          
          // Find the department to get its letter
          const dept = departments.find(d => d.id === departmentId);
          const deptLetter = dept?.letter || departmentId?.charAt(0)?.toUpperCase() || '';
          const divisionString = `${semesterId}${deptLetter}${divisionNum}`;
          
          const assignmentsWithDivision = data.assignments.map((assignment: any) => ({
            ...assignment,
            division: divisionString,
          }));
          allAssignments.push(...assignmentsWithDivision);
        }
      });
      setAssignments(allAssignments);
      setLoading(false);
    });

    return () => {
      facultyUnsubscribe();
      timetablesUnsubscribe();
    };
  }, []);

  const getAssignmentForCell = (facultyId: string, day: string, slot: string) => {
    return assignments.find(
      a => a.faculty.id === facultyId && a.day === day && a.timeSlot === slot
    );
  };

  const getCellStyle = (assignment: Assignment | undefined) => {
    if (!assignment) {
      return 'bg-amber-50 text-gray-600'; // Light beige for free slots
    }

    const subjectType = assignment.subject.subjectType?.toLowerCase() || '';

    if (subjectType.includes('lab') || subjectType.includes('practical') || subjectType.includes('ml')) {
      return 'bg-green-100 text-green-800'; // Green for lab/ML sessions
    } else if (subjectType.includes('tutorial') || subjectType.includes('nss')) {
      return 'bg-pink-100 text-pink-800'; // Pink/Magenta for practical/tutorial/NSS
    } else if (subjectType.includes('phd') || subjectType.includes('research') || subjectType.includes('academic')) {
      return 'bg-yellow-100 text-yellow-800'; // Yellow for special allocation
    } else {
      return 'bg-orange-100 text-orange-800'; // Orange for theory lectures
    }
  };

  const formatDivision = (division: string) => {
    return division;
  };

  const getFacultyDisplayName = (fac: Faculty) => {
    const title = fac.title || 'Dr.';
    return `${title} ${fac.name}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 text-center">
          <h3 className="text-lg font-semibold text-gray-900">Faculty Master Timetable</h3>
        </div>
        <div className="p-8 text-center">
          <p className="text-gray-500">Loading faculty data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 text-center">
        <h3 className="text-lg font-semibold text-gray-900">Faculty Master Timetable</h3>
      </div>
      <div className="overflow-auto max-h-[70vh]">
        {faculty.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No faculty found. Add faculty in the Faculty section.</p>
          </div>
        ) : (
          <table className="w-full border-collapse min-w-max">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[250px] sticky left-0 bg-green-50 z-20">
                  Faculty
                </th>
                {days.map(day => (
                  timeSlots.map(slot => (
                    <th
                      key={`${day}-${slot}`}
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0 min-w-[140px]"
                    >
                      <div>{day}</div>
                      <div className="text-gray-400 text-xs mt-1">{slot}</div>
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {faculty.map((fac) => (
                <tr key={fac.id} className="border-b border-gray-200 last:border-b-0">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 bg-green-50 border-r border-gray-200 min-w-[250px] sticky left-0 z-10">
                    {getFacultyDisplayName(fac)}
                  </td>
                  {days.map(day => (
                    timeSlots.map(slot => {
                      const assignment = getAssignmentForCell(fac.id, day, slot);
                      const cellStyle = getCellStyle(assignment);

                      return (
                        <td
                          key={`${fac.id}-${day}-${slot}`}
                          className={`px-2 py-2 text-center text-xs border-r border-gray-200 last:border-r-0 min-w-[140px] ${cellStyle}`}
                        >
                          {assignment ? (
                            <div className="leading-tight">
                              <div className="font-medium">{formatDivision(assignment.division)} : {assignment.subject.subjectShortName || assignment.subject.subjectCode}</div>
                              <div className="text-gray-600">{assignment.room.roomNumber}</div>
                              {/* Optional strength can be added here if available */}
                            </div>
                          ) : (
                            <div className="text-gray-500 italic">Free</div>
                          )}
                        </td>
                      );
                    })
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default FacultyMasterGrid;
