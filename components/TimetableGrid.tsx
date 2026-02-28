import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { collection, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import TimetableCellModal from '@/components/TimetableCellModal';

interface TimeSlot {
  time: string;
  type: 'teaching' | 'break';
  breakType?: string;
}

interface ShiftConfig {
  name: string;
  slots: TimeSlot[];
}

const morningShift: ShiftConfig = {
  name: 'Morning Shift',
  slots: [
    { time: '07:30 – 08:25', type: 'teaching' },
    { time: '08:25 – 09:20', type: 'teaching' },
    { time: '09:20 – 09:30', type: 'break', breakType: 'Recess' },
    { time: '09:30 – 10:25', type: 'teaching' },
    { time: '10:25 – 11:20', type: 'teaching' },
    { time: '11:20 – 12:20', type: 'break', breakType: 'Lunch' },
    { time: '12:20 – 01:15', type: 'teaching' },
    { time: '01:15 – 02:10', type: 'teaching' },
  ],
};

const generalShift: ShiftConfig = {
  name: 'General Shift',
  slots: [
    { time: '09:30 – 10:25', type: 'teaching' },
    { time: '10:25 – 11:20', type: 'teaching' },
    { time: '11:20 – 12:20', type: 'break', breakType: 'Lunch' },
    { time: '12:20 – 01:15', type: 'teaching' },
    { time: '01:15 – 02:10', type: 'teaching' },
    { time: '02:10 – 02:30', type: 'break', breakType: 'Recess' },
    { time: '02:30 – 03:25', type: 'teaching' },
    { time: '03:25 – 04:20', type: 'teaching' },
  ],
};

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Assignment {
  subject: any;
  faculty: any;
  room: any;
  timeSlot: string;
  day: string;
}

interface TimetableGridProps {
  semesterId: string;
  departmentId: string;
  division: string;
}

const TimetableGrid: React.FC<TimetableGridProps> = ({ semesterId, departmentId, division }) => {
  const [selectedShift, setSelectedShift] = useState<'morning' | 'general'>('morning');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ timeSlot: string; day: string } | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const currentShift = selectedShift === 'morning' ? morningShift : generalShift;

  // Load assignments from database on component mount
  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const timetableDocRef = doc(db, 'timetables', `${semesterId}_${departmentId}_${division}`);
        const timetableDoc = await getDoc(timetableDocRef);

        if (timetableDoc.exists()) {
          const data = timetableDoc.data();
          if (data.assignments) {
            setAssignments(data.assignments);
          }
        }
      } catch (error) {
        console.error('Error loading assignments:', error);
      }
    };

    loadAssignments();
  }, [semesterId, departmentId, division]);

  const handleCellClick = (timeSlot: string, day: string) => {
    setSelectedCell({ timeSlot, day });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCell(null);
  };

  const handleCellSelect = (subject: any, faculty: any, room: any) => {
    if (subject && faculty && room && selectedCell) {
      const newAssignments: Assignment[] = [];

      // For lab subjects, assign to two consecutive slots
      if (subject.isLaboratory) {
        const currentSlotIndex = currentShift.slots.findIndex(slot => slot.time === selectedCell.timeSlot);
        if (currentSlotIndex >= 0 && currentSlotIndex < currentShift.slots.length - 1) {
          // Check if next slot is also a teaching slot
          const nextSlot = currentShift.slots[currentSlotIndex + 1];
          if (nextSlot && nextSlot.type === 'teaching') {
            // Create assignments for both slots
            const firstAssignment: Assignment = {
              subject,
              faculty,
              room,
              timeSlot: selectedCell.timeSlot,
              day: selectedCell.day,
            };

            const secondAssignment: Assignment = {
              subject,
              faculty,
              room,
              timeSlot: nextSlot.time,
              day: selectedCell.day,
            };

            newAssignments.push(firstAssignment, secondAssignment);
          } else {
            // If next slot is break or end, prevent assignment and show message
            alert("lab is of 2 hrs and can't be assign here");
            handleModalClose();
            return;
          }
        } else {
          // Last slot or not found, prevent assignment for lab
          alert("lab is of 2 hrs and can't be assign here");
          handleModalClose();
          return;
        }
      } else {
        // For regular subjects, assign to single slot
        const singleAssignment: Assignment = {
          subject,
          faculty,
          room,
          timeSlot: selectedCell.timeSlot,
          day: selectedCell.day,
        };
        newAssignments.push(singleAssignment);
      }

      // Add or update assignments
      setAssignments(prev => {
        let updated = [...prev];

        newAssignments.forEach(newAssignment => {
          const existingIndex = prev.findIndex(
            a => a.timeSlot === newAssignment.timeSlot && a.day === newAssignment.day
          );

          if (existingIndex >= 0) {
            // Update existing assignment
            updated[existingIndex] = newAssignment;
          } else {
            // Add new assignment
            updated.push(newAssignment);
          }
        });

        return updated;
      });
    }

    handleModalClose();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validate data before saving
      if (!semesterId || !departmentId || !division) {
        alert('Missing required data. Please refresh the page and try again.');
        return;
      }

      // Clean assignments data to remove any undefined values and ensure all fields are valid
      const cleanAssignments = assignments
        .filter(assignment =>
          assignment.subject &&
          assignment.faculty &&
          assignment.room &&
          assignment.timeSlot &&
          assignment.day
        )
        .map(assignment => ({
          subject: {
            id: String(assignment.subject.id || ''),
            subjectName: String(assignment.subject.subjectName || ''),
            subjectCode: String(assignment.subject.subjectCode || ''),
            subjectShortName: String(assignment.subject.subjectShortName || ''),
            subjectId: String(assignment.subject.subjectId || ''),
          },
          faculty: {
            id: String(assignment.faculty.id || ''),
            name: String(assignment.faculty.name || ''),
            shortName: String(assignment.faculty.shortName || ''),
            facultyId: String(assignment.faculty.facultyId || ''),
          },
          room: {
            id: String(assignment.room.id || ''),
            roomNumber: String(assignment.room.roomNumber || ''),
            roomId: String(assignment.room.roomId || ''),
          },
          timeSlot: String(assignment.timeSlot),
          day: String(assignment.day),
        }));

      const timetableDocRef = doc(db, 'timetables', `${semesterId}_${departmentId}_${division}`);
      await setDoc(timetableDocRef, {
        semesterId: String(semesterId),
        departmentId: String(departmentId),
        division: String(division),
        assignments: cleanAssignments,
        shift: String(selectedShift || 'morning'),
        lastUpdated: new Date(),
      });
      alert('Timetable saved successfully!');
    } catch (error) {
      console.error('Error saving timetable:', error);
      alert('Error saving timetable. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset the entire timetable? This will delete all assignments.')) {
      return;
    }

    setIsResetting(true);
    try {
      const timetableDocRef = doc(db, 'timetables', `${semesterId}_${departmentId}_${division}`);
      await deleteDoc(timetableDocRef);
      setAssignments([]);
      alert('Timetable reset successfully!');
    } catch (error) {
      console.error('Error resetting timetable:', error);
      alert('Error resetting timetable. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Timetable Grid</h3>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleReset}
            disabled={isResetting || assignments.length === 0}
          >
            {isResetting ? 'Resetting...' : 'Reset Timetable'}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedShift === 'morning' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedShift('morning')}
          >
            Morning Shift
          </Button>
          <Button
            variant={selectedShift === 'general' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedShift('general')}
          >
            General Shift
          </Button>
        </div>
      </div>
      <div className="overflow-x-hidden overflow-y-auto max-h-[40rem]">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[120px]">
                Time
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0 min-w-[120px]"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {currentShift.slots.map((slot, index) => (
              <tr key={index} className="border-b border-gray-200 last:border-b-0">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200 min-w-[120px]">
                  {slot.time}
                </td>
                {slot.type === 'break' ? (
                  <td
                    colSpan={days.length}
                    className="px-4 py-3 text-sm text-center text-gray-700 bg-yellow-50 border-r border-gray-200 last:border-r-0"
                  >
                    {slot.breakType} Break
                  </td>
                ) : (
                  days.map((day) => {
                    const assignment = assignments.find(
                      a => a.timeSlot === slot.time && a.day === day
                    );

                    return (
                      <td
                        key={day}
                        className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 last:border-r-0 hover:bg-gray-50 cursor-pointer transition-colors min-w-[120px]"
                        onClick={() => handleCellClick(slot.time, day)}
                      >
                        {assignment ? (
                          <div className="text-center">
                            <div className="font-medium text-blue-600">
                              {assignment.subject.subjectShortName || assignment.subject.subjectCode}
                            </div>
                            <div className="text-xs text-gray-600">
                              ({assignment.faculty.shortName}) {assignment.room.roomNumber}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 text-xs">
                            Click to assign
                          </div>
                        )}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {assignments.length > 0 && (
            <span>{assignments.length} assignment{assignments.length !== 1 ? 's' : ''} created</span>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleReset}
            disabled={isResetting || assignments.length === 0}
          >
            {isResetting ? 'Resetting...' : 'Reset Timetable'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
          >
            {isSaving ? 'Saving...' : 'Save Timetable'}
          </Button>
        </div>
      </div>

      <TimetableCellModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSelect={handleCellSelect}
        timeSlot={selectedCell?.timeSlot || ''}
        day={selectedCell?.day || ''}
        semesterId={semesterId}
        departmentId={departmentId}
        division={division}
        slots={currentShift.slots}
      />
    </div>
  );
};

export default TimetableGrid;
