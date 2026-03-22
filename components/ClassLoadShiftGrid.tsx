'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { departments } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Room {
  id: string;
  roomNumber: string;
  isLab?: boolean;
}

interface Faculty {
  id: string;
  facultyId?: string;
  name: string;
  shortName: string;
  status: 'Active' | 'Inactive';
}

interface Assignment {
  subject?: {
    subjectShortName?: string;
    subjectCode?: string;
  };
  faculty?: {
    id?: string;
    facultyId?: string;
    name?: string;
    shortName?: string;
  };
  room?: {
    roomNumber?: string;
  };
  timeSlot: string;
  day: string;
}

interface AssignmentRecord {
  timetableId: string;
  assignmentIndex: number;
  classCode: string;
  assignment: Assignment;
}

interface FacultyOptionStatus {
  faculty: Faculty;
  isLocked: boolean;
  lockedDivision?: string;
}

interface FacultyOverride {
  id?: string;
  facultyId?: string;
  name?: string;
  shortName?: string;
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const teachingSlots = [
  '07:30 – 08:25',
  '08:25 – 09:20',
  '09:30 – 10:25',
  '10:25 – 11:20',
  '12:20 – 01:15',
  '01:15 – 02:10',
  '02:30 – 03:25',
  '03:25 – 04:20',
];

const getCurrentDayName = (): string => {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return names[new Date().getDay()];
};

export default function ClassLoadShiftGrid() {
  const [selectedDay, setSelectedDay] = useState<string>(
    days.includes(getCurrentDayName()) ? getCurrentDayName() : 'Monday'
  );
  const [rooms, setRooms] = useState<Room[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [assignmentRecords, setAssignmentRecords] = useState<AssignmentRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AssignmentRecord | null>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [temporaryFacultyOverrides, setTemporaryFacultyOverrides] = useState<Record<string, FacultyOverride>>({});

  useEffect(() => {
    const unsubscribeRooms = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      const roomList: Room[] = snapshot.docs.map((roomDoc) => {
        const data = roomDoc.data();
        return {
          id: roomDoc.id,
          roomNumber: String(data.roomNumber || ''),
          isLab: Boolean(data.isLab || false),
        };
      });
      setRooms(roomList);
    });

    const unsubscribeFaculty = onSnapshot(collection(db, 'faculty'), (snapshot) => {
      const facultyList: Faculty[] = snapshot.docs.map((facultyDoc) => {
        const data = facultyDoc.data();
        return {
          id: facultyDoc.id,
          facultyId: data.facultyId || facultyDoc.id,
          name: String(data.name || ''),
          shortName: String(data.shortName || ''),
          status: (data.status as 'Active' | 'Inactive') || 'Active',
        };
      });
      setFaculty(facultyList);
    });

    const unsubscribeTimetables = onSnapshot(collection(db, 'timetables'), (snapshot) => {
      const records: AssignmentRecord[] = [];

      snapshot.docs.forEach((timetableDoc) => {
        const data = timetableDoc.data();
        const assignments: Assignment[] = Array.isArray(data.assignments) ? data.assignments : [];

        const [semesterId, departmentId, divisionNumber] = String(timetableDoc.id).split('_');
        const department = departments.find((d) => d.id === departmentId);
        const departmentLetter = department?.letter || String(departmentId || '').charAt(0).toUpperCase();
        const classCode = `${semesterId || ''}${departmentLetter || ''}${divisionNumber || data.division || ''}`;

        assignments.forEach((assignment, index) => {
          records.push({
            timetableId: timetableDoc.id,
            assignmentIndex: index,
            classCode,
            assignment,
          });
        });
      });

      setAssignmentRecords(records);
    });

    return () => {
      unsubscribeRooms();
      unsubscribeFaculty();
      unsubscribeTimetables();
    };
  }, []);

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      const numA = parseInt(a.roomNumber.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.roomNumber.replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return a.roomNumber.localeCompare(b.roomNumber);
    });
  }, [rooms]);

  const assignmentsForDay = useMemo(() => {
    return assignmentRecords.filter((record) => record.assignment.day === selectedDay);
  }, [assignmentRecords, selectedDay]);

  const getRecordKey = (record: AssignmentRecord) => `${record.timetableId}:${record.assignmentIndex}`;

  const getEffectiveAssignment = (record: AssignmentRecord): Assignment => {
    const override = temporaryFacultyOverrides[getRecordKey(record)];
    if (!override) {
      return record.assignment;
    }

    return {
      ...record.assignment,
      faculty: {
        ...record.assignment.faculty,
        ...override,
      },
    };
  };

  const getRecordForCell = (roomNumber: string, slot: string): AssignmentRecord | undefined => {
    return assignmentsForDay.find(
      (record) => record.assignment.room?.roomNumber === roomNumber && record.assignment.timeSlot === slot
    );
  };

  const getFacultyStatusForSlot = (slot: string, currentRecord?: AssignmentRecord): FacultyOptionStatus[] => {
    const occupiedByFaculty = new Map<string, string>();

    assignmentsForDay
      .filter((record) => record.assignment.timeSlot === slot)
      .forEach((record) => {
        const effective = getEffectiveAssignment(record);
        const id = effective.faculty?.id;
        const facultyId = effective.faculty?.facultyId;
        if (id) {
          occupiedByFaculty.set(id, record.classCode);
        }
        if (facultyId) {
          occupiedByFaculty.set(facultyId, record.classCode);
        }
      });

    const effectiveCurrent = currentRecord ? getEffectiveAssignment(currentRecord) : undefined;
    const currentFacultyId = effectiveCurrent?.faculty?.id;
    const currentFacultyCode = effectiveCurrent?.faculty?.facultyId;

    return faculty
      .filter((f) => f.status === 'Active')
      .map((f) => {
        const lockedDivision = occupiedByFaculty.get(f.id) || occupiedByFaculty.get(f.facultyId || '');
        const isCurrentFaculty =
          f.id === currentFacultyId ||
          f.facultyId === currentFacultyId ||
          f.id === currentFacultyCode ||
          f.facultyId === currentFacultyCode;

        return {
          faculty: f,
          isLocked: Boolean(lockedDivision) && !isCurrentFaculty,
          lockedDivision,
        };
      })
      .sort((a, b) => {
        if (a.isLocked !== b.isLocked) {
          return a.isLocked ? 1 : -1;
        }
        return a.faculty.name.localeCompare(b.faculty.name);
      });
  };

  const handleOpenShiftModal = (record: AssignmentRecord) => {
    setSelectedRecord(record);
    setSelectedFacultyId('');
  };

  const handleCloseShiftModal = () => {
    if (isSaving) return;
    setSelectedRecord(null);
    setSelectedFacultyId('');
  };

  const handleShiftFaculty = async () => {
    if (!selectedRecord || !selectedFacultyId) return;

    const targetFaculty = faculty.find((f) => f.id === selectedFacultyId || f.facultyId === selectedFacultyId);
    if (!targetFaculty) {
      alert('Selected faculty not found.');
      return;
    }

    setIsSaving(true);
    try {
      const key = getRecordKey(selectedRecord);
      setTemporaryFacultyOverrides((prev) => ({
        ...prev,
        [key]: {
          id: targetFaculty.id,
          facultyId: targetFaculty.facultyId || targetFaculty.id,
          name: targetFaculty.name,
          shortName: targetFaculty.shortName,
        },
      }));

      alert('Faculty load shifted temporarily for this day view.');
      handleCloseShiftModal();
    } catch (error) {
      console.error('Error shifting faculty load:', error);
      alert('Failed to shift faculty load. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const facultyOptionsForSelectedRecord = selectedRecord
    ? getFacultyStatusForSlot(selectedRecord.assignment.timeSlot, selectedRecord)
    : [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Class Load Shift Grid</h3>
          <p className="text-sm text-gray-600">
            Select a day and reassign lecture load to a free faculty for the same time slot.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="day" className="text-sm text-gray-700">Day</label>
          <select
            id="day"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            {days.map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative isolate overflow-x-auto overflow-y-auto max-h-[70vh]">
        <table className="w-full border-collapse min-w-max">
          <thead className="bg-gray-50 sticky top-0 z-20">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[170px] sticky left-0 bg-gray-50 z-30">
                Room / Lab
              </th>
              {teachingSlots.map((slot) => (
                <th
                  key={slot}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[170px]"
                >
                  {slot}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRooms.map((room) => (
              <tr key={room.id} className="border-b border-gray-200">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 sticky left-0 bg-white z-10">
                  {room.roomNumber} {room.isLab ? '(Lab)' : '(Lecture)'}
                </td>
                {teachingSlots.map((slot) => {
                  const record = getRecordForCell(room.roomNumber, slot);
                  const effectiveAssignment = record ? getEffectiveAssignment(record) : undefined;
                  return (
                    <td key={`${room.id}-${slot}`} className="px-2 py-2 border-r border-gray-200 min-w-[170px] align-top">
                      {record ? (
                        <Card
                          className="p-2 border border-orange-200 bg-orange-50 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleOpenShiftModal(record)}
                        >
                          <div className="text-xs leading-tight space-y-1">
                            <div className="font-semibold text-gray-900">
                              {record.classCode} : {effectiveAssignment?.subject?.subjectShortName || effectiveAssignment?.subject?.subjectCode || 'N/A'}
                            </div>
                            <div className="text-gray-700">
                              Faculty: {effectiveAssignment?.faculty?.shortName || effectiveAssignment?.faculty?.name || 'N/A'}
                            </div>
                            <div className="text-blue-700 font-medium">Click to shift (temporary)</div>
                          </div>
                        </Card>
                      ) : (
                        <div className="text-center text-xs text-gray-500 bg-green-50 rounded-md py-3">Free</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900">Shift Faculty Load</h4>
              <p className="text-sm text-gray-600 mt-1">
                {selectedDay} {selectedRecord.assignment.timeSlot} | {selectedRecord.classCode}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-800">
                <p><span className="font-medium">Subject:</span> {selectedRecord.assignment.subject?.subjectShortName || selectedRecord.assignment.subject?.subjectCode || 'N/A'}</p>
                <p><span className="font-medium">Current Faculty:</span> {getEffectiveAssignment(selectedRecord).faculty?.name || getEffectiveAssignment(selectedRecord).faculty?.shortName || 'N/A'}</p>
                <p><span className="font-medium">Room:</span> {selectedRecord.assignment.room?.roomNumber || 'N/A'}</p>
              </div>

              <div>
                <label htmlFor="replacementFaculty" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Faculty (Occupied/Unavailable means busy in another division)
                </label>
                <select
                  id="replacementFaculty"
                  value={selectedFacultyId}
                  onChange={(e) => setSelectedFacultyId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Choose faculty...</option>
                  {facultyOptionsForSelectedRecord.map(({ faculty: f, isLocked, lockedDivision }) => (
                    <option key={f.id} value={f.id} disabled={isLocked}>
                      {f.name} ({f.shortName}) {isLocked ? `- Occupied/Unavailable (${lockedDivision})` : '- Available'}
                    </option>
                  ))}
                </select>
                {facultyOptionsForSelectedRecord.length > 0 && (
                  <p className="text-xs text-gray-600 mt-2">Occupied/Unavailable faculty are busy in another division for this slot and cannot be selected.</p>
                )}
                {facultyOptionsForSelectedRecord.filter(option => !option.isLocked).length === 0 && (
                  <p className="text-sm text-red-600 mt-2">No available faculty in this slot.</p>
                )}
                <p className="text-xs text-blue-700 mt-2">This shift is temporary for this day/session view and does not permanently update the database.</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="outline" onClick={handleCloseShiftModal} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={handleShiftFaculty}
                disabled={
                  isSaving ||
                  !selectedFacultyId ||
                  facultyOptionsForSelectedRecord.filter(option => !option.isLocked).length === 0
                }
              >
                {isSaving ? 'Shifting...' : 'Shift Load'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
