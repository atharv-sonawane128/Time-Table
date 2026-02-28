'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

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

interface AddFacultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (faculty: Omit<Faculty, 'id'>) => Promise<void>;
  editingFaculty?: Faculty | null;
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

const subjects = [
  'Data Structures',
  'Algorithms',
  'Database Systems',
  'Operating Systems',
  'Computer Networks',
  'Software Engineering',
  'Web Development',
  'Machine Learning',
  'Artificial Intelligence',
  'Cyber Security',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Engineering Drawing',
  'Thermodynamics',
  'Fluid Mechanics',
  'Structural Analysis'
];

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const timeSlots = [
  '9:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 1:00 PM',
  '2:00 PM - 3:00 PM',
  '3:00 PM - 4:00 PM',
  '4:00 PM - 5:00 PM'
];

export default function AddFacultyModal({ isOpen, onClose, onAdd, editingFaculty }: AddFacultyModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    misId: '',
    shortName: '',
    phone: '',
    facultyId: '',
    department: '',
    designation: 'Assistant Professor',
    subjects: [] as string[],
    maxLecturesPerWeek: 20,
    availableDays: [] as string[],
    preferredTimeSlots: [] as string[],
    status: 'Active' as 'Active' | 'Inactive',
    role: 'Faculty' as 'Faculty' | 'HOD' | 'Admin'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingFaculty) {
      setFormData({
        name: editingFaculty.name,
        email: editingFaculty.email,
        misId: editingFaculty.misId,
        shortName: editingFaculty.shortName,
        phone: editingFaculty.phone || '',
        facultyId: editingFaculty.id,
        department: editingFaculty.department,
        designation: editingFaculty.designation,
        subjects: editingFaculty.subjects,
        maxLecturesPerWeek: editingFaculty.maxLecturesPerWeek,
        availableDays: editingFaculty.availableDays,
        preferredTimeSlots: editingFaculty.preferredTimeSlots,
        status: editingFaculty.status,
        role: editingFaculty.role
      });
    } else {
      const newFacultyId = `FAC${Date.now()}`;
      setFormData({
        name: '',
        email: '',
        misId: '',
        shortName: '',
        phone: '',
        facultyId: newFacultyId,
        department: '',
        designation: 'Assistant Professor',
        subjects: [],
        maxLecturesPerWeek: 20,
        availableDays: [],
        preferredTimeSlots: [],
        status: 'Active',
        role: 'Faculty'
      });
    }
    setErrors({});
  }, [editingFaculty, isOpen]);

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
    if (!String(formData.name || '').trim()) newErrors.name = 'Full Name is required';
    if (!String(formData.email || '').trim()) newErrors.email = 'Email Address is required';
    if (!String(formData.misId || '').trim()) newErrors.misId = 'MIS ID is required';
    if (!String(formData.shortName || '').trim()) newErrors.shortName = 'Faculty Short Name is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (formData.availableDays.length === 0) newErrors.availableDays = 'At least one available day is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Check for duplicate MIS ID
      const existingFaculties = await getDocs(collection(db, 'faculty'));
      const existingMisIds = existingFaculties.docs.map(doc => doc.data().misId);
      const isDuplicate = existingMisIds.includes(formData.misId) && (!editingFaculty || editingFaculty.misId !== formData.misId);

      if (isDuplicate) {
        setErrors({ misId: 'A faculty with this MIS ID already exists.' });
        setIsLoading(false);
        return;
      }

      const facultyData: Omit<Faculty, 'id'> = {
        ...formData,
        facultyId: formData.facultyId
      };

      await onAdd(facultyData);
      onClose();
    } catch (error) {
      console.error('Error adding faculty:', error);
      setErrors({ general: 'Failed to add faculty. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubjectChange = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
    if (errors.subjects) setErrors(prev => ({ ...prev, subjects: '' }));
  };

  const handleDayChange = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }));
    if (errors.availableDays) setErrors(prev => ({ ...prev, availableDays: '' }));
  };

  const handleTimeSlotChange = (slot: string) => {
    setFormData(prev => ({
      ...prev,
      preferredTimeSlots: prev.preferredTimeSlots.includes(slot)
        ? prev.preferredTimeSlots.filter(s => s !== slot)
        : [...prev.preferredTimeSlots, slot]
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
            <h2 className="text-2xl font-bold text-gray-900">Add Faculty</h2>
            <p className="text-gray-600 mt-1">Create a new faculty profile for timetable scheduling</p>
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
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                  }}
                  className={errors.name ? 'border-red-500' : ''}
                  placeholder="Enter full name"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, email: e.target.value }));
                    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                  }}
                  className={errors.email ? 'border-red-500' : ''}
                  placeholder="Enter email address"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  MIS ID <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.misId}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, misId: e.target.value }));
                    if (errors.misId) setErrors(prev => ({ ...prev, misId: '' }));
                  }}
                  className={errors.misId ? 'border-red-500' : ''}
                  placeholder="Enter MIS ID"
                />
                {errors.misId && <p className="text-red-500 text-sm mt-1">{errors.misId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Faculty Short Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.shortName}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, shortName: e.target.value }));
                    if (errors.shortName) setErrors(prev => ({ ...prev, shortName: '' }));
                  }}
                  className={errors.shortName ? 'border-red-500' : ''}
                  placeholder="Enter short name (e.g., JD)"
                />
                {errors.shortName && <p className="text-red-500 text-sm mt-1">{errors.shortName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Faculty ID
                </label>
                <Input
                  value={formData.facultyId}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Academic Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  Designation
                </label>
                <select
                  value={formData.designation}
                  onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Professor">Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="Guest">Guest</option>
                </select>
              </div>



              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Lectures Per Week
                </label>
                <Input
                  type="number"
                  value={formData.maxLecturesPerWeek}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxLecturesPerWeek: parseInt(e.target.value) || 0 }))}
                  min="1"
                  max="50"
                />
              </div>
            </div>
          </div>

          {/* Availability Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Availability Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Days <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {daysOfWeek.map(day => (
                    <label key={day} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.availableDays.includes(day)}
                        onChange={() => handleDayChange(day)}
                        className="rounded"
                      />
                      <span className="text-sm">{day}</span>
                    </label>
                  ))}
                </div>
                {errors.availableDays && <p className="text-red-500 text-sm mt-1">{errors.availableDays}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Time Slots
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {timeSlots.map(slot => (
                    <label key={slot} className="flex items-center space-x-2 mb-1">
                      <input
                        type="checkbox"
                        checked={formData.preferredTimeSlots.includes(slot)}
                        onChange={() => handleTimeSlotChange(slot)}
                        className="rounded"
                      />
                      <span className="text-sm">{slot}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Status & Role */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status & Role</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Faculty Status
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="status"
                      value="Active"
                      checked={formData.status === 'Active'}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'Active' | 'Inactive' }))}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="status"
                      value="Inactive"
                      checked={formData.status === 'Inactive'}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'Active' | 'Inactive' }))}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Inactive</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'Faculty' | 'HOD' | 'Admin' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Faculty">Faculty</option>
                  <option value="HOD">HOD</option>
                  <option value="Admin">Admin</option>
                </select>
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
            disabled={isLoading || !String(formData.name || '').trim() || !String(formData.email || '').trim() || !String(formData.misId || '').trim() || !String(formData.shortName || '').trim() || !formData.department}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Adding Faculty...' : editingFaculty ? 'Update Faculty' : 'Add Faculty'}
          </Button>
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Adding faculty...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
