import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const doubleSlots = [
  '07:30 – 09:20',
  '09:30 – 11:20',
  '12:20 – 02:10',
  '02:30 – 04:20',
];

interface Lab {
  id: string;
  roomNumber: string;
  capacity: number;
  department: string;
  floor: number;
  allocatedDevices: string[];
  hasSmartBoard: boolean;
  status: 'Available' | 'Occupied' | 'Under Maintenance';
  roomId: string;
  isLab: boolean;
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



const LabMasterGrid: React.FC = () => {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeRooms = onSnapshot(collection(db, 'rooms'), (roomQuerySnapshot) => {
      const labList: Lab[] = [];
      roomQuerySnapshot.forEach((doc) => {
        const data = doc.data();
        // Check for isLab field or detect labs by room number containing 'lab' or 'Lab'
        const isLab = Boolean(data.isLab) || String(data.roomNumber || '').toLowerCase().includes('lab');
        if (isLab) {
          labList.push({
            id: doc.id,
            roomNumber: String(data.roomNumber || ''),
            capacity: data.capacity || 0,
            department: String(data.department || ''),
            floor: data.floor || 1,
            allocatedDevices: Array.isArray(data.allocatedDevices) ? data.allocatedDevices : [],
            hasSmartBoard: data.hasSmartBoard || false,
            status: data.status || 'Available',
            roomId: data.roomId || doc.id,
            isLab: true
          } as Lab);
        }
      });
      setLabs(labList);
    });

    // Fetch all timetable assignments
    const unsubscribeTimetables = onSnapshot(collection(db, 'timetables'), (timetableQuerySnapshot) => {
      const allAssignments: Assignment[] = [];
      timetableQuerySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.assignments && Array.isArray(data.assignments)) {
          allAssignments.push(...data.assignments);
        }
      });
      setAssignments(allAssignments);
      setLoading(false);
    });

    return () => {
      unsubscribeRooms();
      unsubscribeTimetables();
    };
  }, []);

  const getAssignmentForCell = (lab: string, day: string, slot: string) => {
    // Check if there's an assignment for this lab, day, and time slot
    // For double slots, check if any assignment falls within this time range
    return assignments.find(
      a => a.room.roomNumber === lab && a.day === day && (
        a.timeSlot === slot || isTimeSlotInRange(a.timeSlot, slot)
      )
    );
  };

  const isTimeSlotInRange = (assignmentSlot: string, doubleSlot: string) => {
    // Map double slots to their component single slots
    const slotMappings: { [key: string]: string[] } = {
      '07:30 – 09:20': ['07:30 – 08:25', '08:25 – 09:20'],
      '09:30 – 11:20': ['09:30 – 10:25', '10:25 – 11:20'],
      '12:20 – 02:10': ['12:20 – 01:15', '01:15 – 02:10'],
      '02:30 – 04:20': ['02:30 – 03:25', '03:25 – 04:20'],
    };

    const componentSlots = slotMappings[doubleSlot];
    return componentSlots ? componentSlots.includes(assignmentSlot) : false;
  };

  const formatDivision = (division: string) => {
    if (!division || division.length < 3) return division;
    const semester = division[0];
    const department = division[1];
    const div = division[2];
    return `${semester}-${department}-${div}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Lab Master Grid</h3>
          <p className="text-sm text-gray-600">Lab availability and session assignments</p>
        </div>
        <div className="p-8 text-center">
          <p className="text-gray-500">Loading labs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Lab Master Grid</h3>
        <p className="text-sm text-gray-600">Lab availability and session assignments</p>
      </div>
      <div className="overflow-auto max-h-[60vh]">
        {labs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No labs found. Add labs in the Rooms section.</p>
          </div>
        ) : (
          <table className="w-full border-collapse min-w-max">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[120px] sticky left-0 bg-gray-50 z-20">
                  Lab
                </th>
                {days.map(day => (
                  doubleSlots.map(slot => (
                    <th
                      key={`${day}-${slot}`}
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0 min-w-[120px]"
                    >
                      <div>{day}</div>
                      <div className="text-gray-400">{slot}</div>
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {labs.map((lab: Lab) => (
                <tr key={lab.id} className="border-b border-gray-200 last:border-b-0">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200 min-w-[120px] sticky left-0 z-10">
                    {lab.roomNumber}
                  </td>
                  {days.map(day => (
                    doubleSlots.map(slot => {
                      const assignment = getAssignmentForCell(lab.roomNumber, day, slot);
                      return (
                        <td
                          key={`${lab.roomNumber}-${day}-${slot}`}
                          className={`px-4 py-3 text-center text-sm text-gray-900 border-r border-gray-200 last:border-r-0 min-w-[120px] cursor-pointer transition-colors ${
                            assignment ? 'bg-blue-50' : 'bg-green-50 italic text-gray-600'
                          }`}
                        >
                          {assignment ? (
                            <div className="text-xs">
                              {assignment.subject.subjectShortName || assignment.subject.subjectCode}
                              ({assignment.faculty.shortName}) {formatDivision(assignment.division)}
                            </div>
                          ) : (
                            'Free'
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

export default LabMasterGrid;
