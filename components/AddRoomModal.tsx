'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

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

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (room: Omit<Room, 'id'>) => Promise<void>;
  editingRoom?: Room | null;
}

const departments = [
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Mechanical',
  'Civil',
  'Electrical',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology'
];

const devices = [
  'Projector',
  'Laptop',
  'Whiteboard',
  'Printer',
  'Scanner',
  'Microphone',
  'Speaker System',
  'Interactive Display'
];

export default function AddRoomModal({ isOpen, onClose, onAdd, editingRoom }: AddRoomModalProps) {
  const [formData, setFormData] = useState({
    roomNumber: '',
    capacity: 0,
    department: '',
    floor: 1,
    allocatedDevices: [] as string[],
    hasSmartBoard: false,
    status: 'Available' as 'Available' | 'Occupied' | 'Under Maintenance',
    roomId: '',
    isLab: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingRoom) {
      setFormData({
        roomNumber: editingRoom.roomNumber,
        capacity: editingRoom.capacity,
        department: editingRoom.department,
        floor: editingRoom.floor,
        allocatedDevices: editingRoom.allocatedDevices,
        hasSmartBoard: editingRoom.hasSmartBoard,
        status: editingRoom.status,
        roomId: editingRoom.roomId,
        isLab: editingRoom.isLab
      });
    } else {
      const newRoomId = `ROOM${Date.now()}`;
      setFormData({
        roomNumber: '',
        capacity: 0,
        department: '',
        floor: 1,
        allocatedDevices: [],
        hasSmartBoard: false,
        status: 'Available',
        roomId: newRoomId,
        isLab: false
      });
    }
    setErrors({});
  }, [editingRoom, isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.roomNumber.trim()) newErrors.roomNumber = 'Room Number is required';
    if (formData.capacity <= 0) newErrors.capacity = 'Capacity must be greater than 0';
    if (!formData.department) newErrors.department = 'Department is required';
    if (formData.floor < 1 || formData.floor > 3) newErrors.floor = 'Floor must be between 1 and 3';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Check for duplicate room number
      const existingRooms = await getDocs(collection(db, 'rooms'));
      const existingRoomNumbers = existingRooms.docs.map(doc => doc.data().roomNumber);
      const isDuplicate = existingRoomNumbers.includes(formData.roomNumber) && (!editingRoom || editingRoom.roomNumber !== formData.roomNumber);

      if (isDuplicate) {
        setErrors({ roomNumber: 'A room with this number already exists.' });
        setIsLoading(false);
        return;
      }

      const roomData: Omit<Room, 'id'> = {
        ...formData,
        roomId: formData.roomId
      };

      await onAdd(roomData);
      onClose();
    } catch (error) {
      console.error('Error adding room:', error);
      setErrors({ general: 'Failed to add room. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeviceChange = (device: string) => {
    setFormData(prev => ({
      ...prev,
      allocatedDevices: prev.allocatedDevices.includes(device)
        ? prev.allocatedDevices.filter(d => d !== device)
        : [...prev.allocatedDevices, device]
    }));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{editingRoom ? 'Edit Room' : 'Add Room'}</h2>
            <p className="text-gray-600 mt-1">Create a new room profile for timetable scheduling</p>
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

        {/* Form Content */}
        <div className="p-6 space-y-8">
          {/* Basic Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Number <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.roomNumber}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, roomNumber: e.target.value }));
                    if (errors.roomNumber) setErrors(prev => ({ ...prev, roomNumber: '' }));
                  }}
                  className={errors.roomNumber ? 'border-red-500' : ''}
                  placeholder="e.g., CS101, LAB201"
                />
                {errors.roomNumber && <p className="text-red-500 text-sm mt-1">{errors.roomNumber}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Capacity <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }));
                    if (errors.capacity) setErrors(prev => ({ ...prev, capacity: '' }));
                  }}
                  className={errors.capacity ? 'border-red-500' : ''}
                  placeholder="Number of students"
                  min="1"
                  max="500"
                />
                {errors.capacity && <p className="text-red-500 text-sm mt-1">{errors.capacity}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, department: e.target.value }));
                    if (errors.department) setErrors(prev => ({ ...prev, department: '' }));
                  }}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.department ? 'border-red-500' : ''}`}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Floor <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.floor}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, floor: parseInt(e.target.value) }));
                    if (errors.floor) setErrors(prev => ({ ...prev, floor: '' }));
                  }}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.floor ? 'border-red-500' : ''}`}
                >
                  <option value={1}>1st Floor</option>
                  <option value={2}>2nd Floor</option>
                  <option value={3}>3rd Floor</option>
                </select>
                {errors.floor && <p className="text-red-500 text-sm mt-1">{errors.floor}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room ID
                </label>
                <Input
                  value={formData.roomId}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Equipment & Facilities */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Equipment & Facilities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allocated Devices
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {devices.map(device => (
                    <label key={device} className="flex items-center space-x-2 mb-1">
                      <input
                        type="checkbox"
                        checked={formData.allocatedDevices.includes(device)}
                        onChange={() => handleDeviceChange(device)}
                        className="rounded"
                      />
                      <span className="text-sm">{device}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Smart Board
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="smartBoard"
                      checked={formData.hasSmartBoard === true}
                      onChange={() => setFormData(prev => ({ ...prev, hasSmartBoard: true }))}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Yes</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="smartBoard"
                      checked={formData.hasSmartBoard === false}
                      onChange={() => setFormData(prev => ({ ...prev, hasSmartBoard: false }))}
                      className="text-blue-600"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Is Lab
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="isLab"
                      checked={formData.isLab === true}
                      onChange={() => setFormData(prev => ({ ...prev, isLab: true }))}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Yes</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="isLab"
                      checked={formData.isLab === false}
                      onChange={() => setFormData(prev => ({ ...prev, isLab: false }))}
                      className="text-blue-600"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Status
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="status"
                    value="Available"
                    checked={formData.status === 'Available'}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'Available' | 'Occupied' | 'Under Maintenance' }))}
                    className="text-blue-600"
                  />
                  <span className="text-sm">Available</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="status"
                    value="Occupied"
                    checked={formData.status === 'Occupied'}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'Available' | 'Occupied' | 'Under Maintenance' }))}
                    className="text-blue-600"
                  />
                  <span className="text-sm">Occupied</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="status"
                    value="Under Maintenance"
                    checked={formData.status === 'Under Maintenance'}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'Available' | 'Occupied' | 'Under Maintenance' }))}
                    className="text-blue-600"
                  />
                  <span className="text-sm">Under Maintenance</span>
                </label>
              </div>
            </div>
          </div>

          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800 text-sm">{errors.general}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.roomNumber || !formData.department || formData.capacity <= 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Adding Room...' : editingRoom ? 'Update Room' : 'Add Room'}
          </Button>
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Adding room...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
