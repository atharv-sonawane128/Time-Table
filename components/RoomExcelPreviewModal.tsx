'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';

interface RoomPreview {
  room: {
    roomNumber: string;
    capacity: number;
    department: string;
    floor: number;
    allocatedDevices: string[];
    hasSmartBoard: boolean;
    status: 'Available' | 'Occupied' | 'Under Maintenance';
    roomId: string;
    isLab: boolean;
  };
  isDuplicate: boolean;
}

interface RoomExcelPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomData: RoomPreview[];
  onImport: (selectedRooms: {roomNumber: string; capacity: number; department: string; floor: number; allocatedDevices: string[]; hasSmartBoard: boolean; status: 'Available' | 'Occupied' | 'Under Maintenance'; roomId: string; isLab: boolean;}[]) => Promise<void>;
  isImporting: boolean;
}

export default function RoomExcelPreviewModal({
  isOpen,
  onClose,
  roomData,
  onImport,
  isImporting
}: RoomExcelPreviewModalProps) {
  // Create sorted data with non-duplicates first, then duplicates
  const sortedRoomData = [...roomData].sort((a, b) => {
    if (a.isDuplicate && !b.isDuplicate) return 1;
    if (!a.isDuplicate && b.isDuplicate) return -1;
    return 0;
  });

  // Create mapping from sorted index to original index
  const sortedToOriginalIndex = sortedRoomData.map(room => roomData.findIndex(r => r === room));

  const [selectedRooms, setSelectedRooms] = useState<Set<number>>(
    new Set(roomData.filter(item => !item.isDuplicate).map((_, index) => index))
  );

  // Update selected rooms when roomData changes
  useEffect(() => {
    setSelectedRooms(new Set(roomData.filter(item => !item.isDuplicate).map((_, index) => index)));
  }, [roomData]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allNonDuplicateIndices = roomData
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.isDuplicate)
        .map(({ index }) => index);
      setSelectedRooms(new Set([...selectedRooms, ...allNonDuplicateIndices]));
    } else {
      setSelectedRooms(new Set());
    }
  };

  const handleSelectRoom = (sortedIndex: number, checked: boolean) => {
    const originalIndex = sortedToOriginalIndex[sortedIndex];
    const newSelected = new Set(selectedRooms);
    if (checked && !roomData[originalIndex].isDuplicate) {
      newSelected.add(originalIndex);
    } else {
      newSelected.delete(originalIndex);
    }
    setSelectedRooms(newSelected);
  };

  const handleImport = async () => {
    const selectedData = roomData.filter((_, index) => selectedRooms.has(index)).map(item => item.room);
    await onImport(selectedData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Preview Room Import</h2>
            <p className="text-gray-600 mt-1">
              Review and select rooms to import from Excel
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {roomData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">All rooms in the Excel file are already added to the system.</p>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="mb-6 flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedRooms.size === roomData.filter(item => !item.isDuplicate).length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({selectedRooms.size} of {roomData.filter(item => !item.isDuplicate).length} selectable rooms selected)
                </span>
              </div>

              {/* Room Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedRoomData.map((room, sortedIndex) => {
                  const originalIndex = sortedToOriginalIndex[sortedIndex];
                  return (
                    <div
                      key={originalIndex}
                      className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative ${
                        selectedRooms.has(originalIndex) ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                      } ${room.isDuplicate ? 'opacity-75' : ''}`}
                    >
                      {room.isDuplicate && (
                        <div className="absolute top-2 right-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                          Room already present
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">{room.room.roomNumber}</h3>
                          <p className="text-gray-600 text-sm">{room.room.department}</p>
                          <p className="text-gray-500 text-sm">Floor {room.room.floor}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedRooms.has(originalIndex)}
                          onChange={(e) => handleSelectRoom(sortedIndex, e.target.checked)}
                          disabled={room.isDuplicate}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <p><strong>Room ID:</strong> {room.room.roomId}</p>
                        <p><strong>Capacity:</strong> {room.room.capacity} students</p>
                        <p><strong>Devices:</strong> {room.room.allocatedDevices.join(', ') || 'None'}</p>
                        <p><strong>Smart Board:</strong> {room.room.hasSmartBoard ? 'Yes' : 'No'}</p>
                        <p><strong>Is Lab:</strong> {room.room.isLab ? 'Yes' : 'No'}</p>
                        <p><strong>Status:</strong> {room.room.status}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {roomData.length > 0 && (
          <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              {selectedRooms.size} of {roomData.length} rooms selected
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose} disabled={isImporting}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedRooms.size === 0 || isImporting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isImporting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Importing...</span>
                  </div>
                ) : (
                  `Import ${selectedRooms.size} Room${selectedRooms.size !== 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isImporting && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Importing rooms...</p>
              <div className="w-64 bg-gray-200 rounded-full h-2 mt-4">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
