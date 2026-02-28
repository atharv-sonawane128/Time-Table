import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Subject {
  id: string;
  subjectName: string;
  subjectCode: string;
  subjectShortName: string;
  isLaboratory: boolean;
  subjectId: string;
  assignedFaculties: string[];
}

interface Faculty {
  id: string;
  name: string;
  email: string;
  misId: string;
  shortName: string;
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
  isLab: boolean;
}

interface Assignment {
  subject: any;
  faculty: any;
  room: any;
  timeSlot: string;
  day: string;
}

interface TimeSlot {
  time: string;
  type: 'teaching' | 'break';
  breakType?: string;
}

interface TimetableCellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (subject: Subject | null, faculty: Faculty | null, room: Room | null) => void;
  timeSlot: string;
  day: string;
  semesterId: string;
  departmentId: string;
  division: string;
  slots: TimeSlot[];
}

const TimetableCellModal: React.FC<TimetableCellModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  timeSlot,
  day,
  semesterId,
  departmentId,
  division,
  slots,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch all timetables to check availability
    const unsubscribeTimetables = onSnapshot(collection(db, 'timetables'), (querySnapshot) => {
      const allAssignmentsList: Assignment[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.assignments && Array.isArray(data.assignments)) {
          allAssignmentsList.push(...data.assignments);
        }
      });
      setAllAssignments(allAssignmentsList);
    });

    // Fetch subjects
    const unsubscribeSubjects = onSnapshot(collection(db, 'subjects'), (querySnapshot) => {
      const subjectList: Subject[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        subjectList.push({
          id: doc.id,
          subjectName: String(data.subjectName || ''),
          subjectCode: String(data.subjectCode || ''),
          subjectShortName: String(data.subjectShortName || ''),
          isLaboratory: Boolean(data.isLaboratory || false),
          subjectId: data.subjectId || doc.id,
          assignedFaculties: Array.isArray(data.assignedFaculties) ? data.assignedFaculties : []
        } as Subject);
      });
      setSubjects(subjectList);
    });

    // Fetch faculties
    const unsubscribeFaculties = onSnapshot(collection(db, 'faculty'), (querySnapshot) => {
      const facultyList: Faculty[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        facultyList.push({
          id: doc.id,
          name: String(data.name || ''),
          email: String(data.email || ''),
          misId: String(data.misId || ''),
          shortName: String(data.shortName || ''),
          phone: data.phone || undefined,
          department: String(data.department || ''),
          designation: String(data.designation || 'Assistant Professor'),
          subjects: Array.isArray(data.subjects) ? data.subjects : [],
          maxLecturesPerWeek: Number(data.maxLecturesPerWeek || 20),
          availableDays: Array.isArray(data.availableDays) ? data.availableDays : [],
          preferredTimeSlots: Array.isArray(data.preferredTimeSlots) ? data.preferredTimeSlots : [],
          status: (data.status as 'Active' | 'Inactive') || 'Active',
          role: (data.role as 'Faculty' | 'HOD' | 'Admin') || 'Faculty',
          facultyId: data.facultyId || doc.id,
        } as Faculty);
      });
      setFaculties(facultyList);
    });

    // Fetch rooms
    const unsubscribeRooms = onSnapshot(collection(db, 'rooms'), (querySnapshot) => {
      const roomList: Room[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        roomList.push({
          id: doc.id,
          roomNumber: String(data.roomNumber || ''),
          capacity: Number(data.capacity || 0),
          department: String(data.department || ''),
          floor: Number(data.floor || 0),
          allocatedDevices: Array.isArray(data.allocatedDevices) ? data.allocatedDevices : [],
          hasSmartBoard: Boolean(data.hasSmartBoard || false),
          status: (data.status as 'Available' | 'Occupied' | 'Under Maintenance') || 'Available',
          roomId: data.roomId || doc.id,
          isLab: Boolean(data.isLab || false),
        } as Room);
      });
      setRooms(roomList);
    });

    return () => {
      unsubscribeTimetables();
      unsubscribeSubjects();
      unsubscribeFaculties();
      unsubscribeRooms();
    };
  }, [isOpen]);

  // Get all faculties for the selected subject, with availability status
  const subjectFaculties = selectedSubject
    ? faculties.filter(faculty => {
        // If faculty has no subjects assigned, don't show them
        if (!faculty.subjects || faculty.subjects.length === 0) return false;

        // Check if faculty is assigned to the selected subject
        // More flexible matching to handle different subject formats
        const subjectMatches = faculty.subjects.some(subject => {
          const facultySubject = subject.toLowerCase().trim();
          const selectedSubjectName = selectedSubject.subjectName.toLowerCase().trim();
          const selectedSubjectCode = selectedSubject.subjectCode.toLowerCase().trim();
          const selectedSubjectShortName = (selectedSubject.subjectShortName || '').toLowerCase().trim();

          return facultySubject.includes(selectedSubjectName) ||
                 facultySubject.includes(selectedSubjectCode) ||
                 (selectedSubjectShortName && facultySubject.includes(selectedSubjectShortName)) ||
                 facultySubject === selectedSubject.subjectId;
        });

        return subjectMatches;
      }).map(faculty => {
        // Check runtime availability
        const isAvailable = !allAssignments.some(assignment =>
          assignment.faculty.facultyId === faculty.facultyId &&
          assignment.timeSlot === timeSlot &&
          assignment.day === day
        );
        return { ...faculty, runtimeStatus: isAvailable ? faculty.status : 'Occupied' as 'Active' | 'Inactive' | 'Occupied' };
      })
    : [];

  // Get all rooms with availability status
  const allRooms = rooms.map(room => {
    // Check runtime availability
    const isAvailable = !allAssignments.some(assignment =>
      assignment.room.roomId === room.roomId &&
      assignment.timeSlot === timeSlot &&
      assignment.day === day
    );
    return { ...room, runtimeStatus: isAvailable ? room.status : 'Occupied' as 'Available' | 'Occupied' | 'Under Maintenance' };
  });

  const handleConfirm = () => {
    onSelect(selectedSubject, selectedFaculty, selectedRoom);
    onClose();
  };

  const handleClear = () => {
    setSelectedSubject(null);
    setSelectedFaculty(null);
    setSelectedRoom(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Assign Subject & Room - {day} {timeSlot}
          </h3>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Subjects Section */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Select Subject</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {subjects.map((subject) => (
                  <Card
                    key={subject.id}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedSubject?.id === subject.id
                        ? 'bg-blue-50 border-blue-300'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedSubject(subject);
                      setSelectedFaculty(null); // Reset faculty when subject changes
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-900">{subject.subjectName}</h5>
                        <p className="text-sm text-gray-600">{subject.subjectCode}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        subject.isLaboratory
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {subject.isLaboratory ? 'Lab' : 'Lecture'}
                      </span>
                    </div>
                  </Card>
                ))}
                {subjects.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No subjects available</p>
                )}
              </div>
            </div>

            {/* Faculty Section */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">
                Select Faculty {selectedSubject ? `for ${selectedSubject.subjectShortName || selectedSubject.subjectCode}` : ''}
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selectedSubject ? (
                  subjectFaculties.map((faculty) => (
                    <Card
                      key={faculty.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedFaculty?.id === faculty.id
                          ? 'bg-blue-50 border-blue-300'
                          : faculty.runtimeStatus === 'Occupied'
                          ? 'bg-red-50 border-red-200'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => faculty.runtimeStatus !== 'Occupied' && setSelectedFaculty(faculty)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900">{faculty.name}</h5>
                          <p className="text-sm text-gray-600">{faculty.shortName} - {faculty.designation}</p>
                          <p className="text-sm text-gray-600">{faculty.department}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          faculty.runtimeStatus === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : faculty.runtimeStatus === 'Inactive'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {faculty.runtimeStatus}
                        </span>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">Select a subject first</p>
                )}
                {selectedSubject && subjectFaculties.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No faculty available for this subject at this time</p>
                )}
              </div>
            </div>

            {/* Rooms Section */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">
                Select Room {selectedSubject?.isLaboratory ? '(All Rooms)' : '(All Rooms)'}
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allRooms.map((room) => (
                  <Card
                    key={room.id}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedRoom?.id === room.id
                        ? 'bg-blue-50 border-blue-300'
                        : room.runtimeStatus === 'Occupied'
                        ? 'bg-red-50 border-red-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => room.runtimeStatus !== 'Occupied' && setSelectedRoom(room)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-900">{room.roomNumber}</h5>
                        <p className="text-sm text-gray-600">
                          Capacity: {room.capacity} | Floor: {room.floor}
                        </p>
                        <p className="text-sm text-gray-600">{room.department}</p>
                        {room.isLab && (
                          <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full mt-1">
                            Lab Room
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        room.runtimeStatus === 'Available'
                          ? 'bg-green-100 text-green-800'
                          : room.runtimeStatus === 'Occupied'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {room.runtimeStatus}
                      </span>
                    </div>
                  </Card>
                ))}
                {allRooms.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No rooms available</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedSubject && selectedFaculty && selectedRoom && (
              <span>
                Selected: <strong>{selectedSubject.subjectShortName || selectedSubject.subjectCode}</strong>(
                <strong>{selectedFaculty.shortName}</strong>) in <strong>{selectedRoom.roomNumber}</strong>
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleClear}>
              Clear Selection
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!selectedSubject || !selectedFaculty || !selectedRoom || subjectFaculties.length === 0 || allRooms.length === 0}>
              Assign
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableCellModal;
