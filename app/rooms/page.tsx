'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import Sidebar from '../../components/sidebar';
import Header from '../../components/header';
import AddRoomModal from '../../components/AddRoomModal';
import RoomExcelPreviewModal from '../../components/RoomExcelPreviewModal';
import * as XLSX from 'xlsx';

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
  runtimeStatus?: 'Available' | 'Occupied' | 'Under Maintenance';
}

export default function RoomsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewRoomData, setPreviewRoomData] = useState<{room: Omit<Room, 'id'>, isDuplicate: boolean}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if (user) {
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

      const updateRoomAvailability = () => {
        const unsubscribeRooms = onSnapshot(collection(db, 'rooms'), (roomSnapshot) => {
          const roomList: Room[] = [];
          roomSnapshot.forEach((doc) => {
            const data = doc.data();
            roomList.push({
              id: doc.id,
              roomNumber: String(data.roomNumber || ''),
              capacity: data.capacity || 0,
              department: String(data.department || ''),
              floor: data.floor || 1,
              allocatedDevices: Array.isArray(data.allocatedDevices) ? data.allocatedDevices : [],
              hasSmartBoard: data.hasSmartBoard || false,
              status: data.status || 'Available',
              roomId: data.roomId || doc.id,
              isLab: data.isLab || false
            } as Room);
          });

          // Listen to timetable changes to update runtime status
          const unsubscribeTimetables = onSnapshot(collection(db, 'timetables'), (timetableSnapshot) => {
            const assignments: any[] = [];
            timetableSnapshot.forEach((doc) => {
              const data = doc.data();
              if (data.assignments && Array.isArray(data.assignments)) {
                assignments.push(...data.assignments.filter((assignment: any) =>
                  assignment.day === demoDay && assignment.timeSlot === demoSlot
                ));
              }
            });

            // Get occupied room IDs for current time slot (only for lecture assignments, not labs)
            const occupiedRoomIds = new Set(
              assignments
                .filter(a => a.subject && !a.subject.isLaboratory) // Only lecture assignments
                .map(a => a.room?.roomId)
                .filter(id => id)
            );

            // Update rooms with runtime status
            const updatedRooms = roomList.map(room => ({
              ...room,
              runtimeStatus: occupiedRoomIds.has(room.roomId) ? 'Occupied' : room.status
            }));

            setRooms(updatedRooms);
          });

          return unsubscribeTimetables;
        });

        return unsubscribeRooms;
      };

      // Initial call
      const cleanup = updateRoomAvailability();

      // Update every minute to reflect current time changes
      const interval = setInterval(() => {
        cleanup?.(); // Clean up previous listeners
        updateRoomAvailability();
      }, 60000); // Update every minute

      return () => {
        cleanup?.();
        clearInterval(interval);
      };
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleAddRoom = async (roomData: Omit<Room, 'id'>) => {
    await addDoc(collection(db, 'rooms'), roomData);
    setIsModalOpen(false);
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setIsModalOpen(true);
  };

  const handleUpdateRoom = async (roomData: Omit<Room, 'id'>) => {
    if (editingRoom) {
      await updateDoc(doc(db, 'rooms', editingRoom.id), roomData);
      setEditingRoom(null);
      setIsModalOpen(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (confirm('Are you sure you want to delete this room?')) {
      await deleteDoc(doc(db, 'rooms', roomId));
    }
  };

  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Parse and validate room data
      const roomData: Omit<Room, 'id'>[] = jsonData
        .map((row: any) => ({
          roomNumber: String(row['Room Number'] || row.roomNumber || '').trim(),
          capacity: parseInt(row.Capacity || row.capacity || '0') || 0,
          department: String(row.Department || row.department || '').trim(),
          floor: parseInt(row.Floor || row.floor || '1') || 1,
          allocatedDevices: typeof row['Allocated Devices'] === 'string' ? row['Allocated Devices'].split(',').map((d: string) => d.trim()) : [],
          hasSmartBoard: row['Smart Board'] === 'Yes' || row.smartBoard === true || row.hasSmartBoard === true,
          status: (row.Status || row.status || 'Available') as Room['status'],
          roomId: row['Room ID'] || row.roomId || `ROOM${Date.now() + Math.random()}`,
          isLab: row['Is Lab'] === 'Yes' || row.isLab === true || row.isLab === 'true'
        }))
        .filter(room => room.roomNumber); // Filter out invalid rows

      if (roomData.length === 0) {
        alert('No valid rooms found in the Excel file. Please check the file format.');
        return;
      }

      // Get existing room numbers from database (case-insensitive)
      const existingRoomNumbers = rooms.map(r => String(r.roomNumber).trim().toLowerCase());

      // Track seen room numbers within Excel file (case-insensitive)
      const seenRoomNumbersInExcel = new Set<string>();

      // Mark duplicates (both from database and within Excel file)
      const previewData = roomData.map(room => {
        const roomNumberLower = room.roomNumber.toLowerCase();
        
        // Check if duplicate exists in database
        const isDuplicateInDB = existingRoomNumbers.includes(roomNumberLower);
        
        // Check if duplicate exists within Excel file
        const isDuplicateInExcel = seenRoomNumbersInExcel.has(roomNumberLower);
        
        // Add to seen room numbers
        seenRoomNumbersInExcel.add(roomNumberLower);
        
        return {
          room,
          isDuplicate: isDuplicateInDB || isDuplicateInExcel
        };
      });

      setPreviewRoomData(previewData);
      setIsPreviewModalOpen(true);
    } catch (error) {
      console.error('Error importing Excel file:', error);
      alert('Error importing Excel file. Please check the file format.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handlePreviewImport = async (selectedRooms: Omit<Room, 'id'>[]) => {
    setIsImporting(true);
    try {
      const promises = selectedRooms.map(data => addDoc(collection(db, 'rooms'), data));
      await Promise.all(promises);
      alert(`Successfully imported ${selectedRooms.length} rooms!`);
    } catch (error) {
      console.error('Error importing rooms:', error);
      alert('Error importing rooms. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  // Separate labs and rooms by floor
  const labs = rooms.filter(room => room.isLab);
  const roomsByFloor = rooms.filter(room => !room.isLab).reduce((acc, room) => {
    if (!acc[room.floor]) {
      acc[room.floor] = [];
    }
    acc[room.floor].push(room);
    return acc;
  }, {} as Record<number, Room[]>);

  const filteredLabs = labs.filter((room) =>
    String(room.roomNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(room.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    const roomA = String(a.roomNumber || '').toLowerCase();
    const roomB = String(b.roomNumber || '').toLowerCase();
    return roomA.localeCompare(roomB);
  });

  const filteredRoomsByFloor = Object.keys(roomsByFloor).reduce((acc, floor) => {
    const floorNum = parseInt(floor);
    const filteredRooms = roomsByFloor[floorNum].filter((room) =>
      String(room.roomNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(room.department || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    // Sort rooms by room number in ascending order
    filteredRooms.sort((a, b) => {
      const roomA = String(a.roomNumber || '').toLowerCase();
      const roomB = String(b.roomNumber || '').toLowerCase();
      return roomA.localeCompare(roomB);
    });
    acc[floorNum] = filteredRooms;
    return acc;
  }, {} as Record<number, Room[]>);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <div className="flex-1 ml-64">
        <Header user={user} onLogout={handleLogout} />
        <main className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="w-46">
              <Input
                placeholder="Search rooms by number or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/room_format.xlsx';
                  link.download = 'room_format.xlsx';
                  link.click();
                }}
              >
                Download Format
              </Button>
              <Button
                variant="outline"
                onClick={handleImportClick}
                disabled={isImporting}
              >
                {isImporting ? 'Importing...' : 'Import from Excel'}
              </Button>
              <Button onClick={() => setIsModalOpen(true)}>Add New Room</Button>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleExcelImport}
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
          />

          {/* Display labs */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Labs</h2>
            {filteredLabs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLabs.map((room) => (
                  <div key={room.id} className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{room.roomNumber}</h3>
                        <p className="text-gray-600">{room.department}</p>
                        <p className="text-gray-500">Floor {room.floor}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        room.runtimeStatus === 'Available' ? 'bg-green-100 text-green-800' :
                        room.runtimeStatus === 'Occupied' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {room.runtimeStatus || room.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-4">
                      <p><strong>Capacity:</strong> {room.capacity} students</p>
                      <p><strong>Devices:</strong> {room.allocatedDevices?.join(', ') || 'None'}</p>
                      <p><strong>Smart Board:</strong> {room.hasSmartBoard ? 'Yes' : 'No'}</p>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRoom(room)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteRoom(room.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No labs found.</p>
            )}
          </div>

          {/* Display rooms grouped by floor */}
          {[1, 2, 3].map(floor => (
            <div key={floor} className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Floor {floor}</h2>
              {filteredRoomsByFloor[floor] && filteredRoomsByFloor[floor].length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRoomsByFloor[floor].map((room) => (
                    <div key={room.id} className="bg-white p-6 rounded-lg shadow-md">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{room.roomNumber}</h3>
                          <p className="text-gray-600">{room.department}</p>
                          <p className="text-gray-500">Floor {room.floor}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          room.runtimeStatus === 'Available' ? 'bg-green-100 text-green-800' :
                          room.runtimeStatus === 'Occupied' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {room.runtimeStatus || room.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-4">
                        <p><strong>Capacity:</strong> {room.capacity} students</p>
                        <p><strong>Devices:</strong> {room.allocatedDevices?.join(', ') || 'None'}</p>
                        <p><strong>Smart Board:</strong> {room.hasSmartBoard ? 'Yes' : 'No'}</p>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRoom(room)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRoom(room.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No rooms found on this floor.</p>
              )}
            </div>
          ))}

          <AddRoomModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingRoom(null);
            }}
            onAdd={editingRoom ? handleUpdateRoom : handleAddRoom}
            editingRoom={editingRoom}
          />

          <RoomExcelPreviewModal
            isOpen={isPreviewModalOpen}
            onClose={() => setIsPreviewModalOpen(false)}
            roomData={previewRoomData}
            onImport={handlePreviewImport}
            isImporting={isImporting}
          />
        </main>
      </div>
    </div>
  );
}
