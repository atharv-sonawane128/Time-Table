'use client';

import { useEffect } from 'react';
import { Button } from './ui/button';

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

interface FacultyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  faculty: Faculty | null;
}

export default function FacultyProfileModal({ isOpen, onClose, faculty }: FacultyProfileModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !faculty) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {faculty.shortName || faculty.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{faculty.name}</h2>
              <p className="text-gray-600">{faculty.designation} - {faculty.department}</p>
              <span className={`inline-block px-3 py-1 text-sm rounded-full mt-2 ${faculty.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {faculty.status}
              </span>
            </div>
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
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <p className="text-gray-900">{faculty.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <p className="text-gray-900">{faculty.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">MIS ID</label>
                <p className="text-gray-900">{faculty.misId}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Faculty Short Name</label>
                <p className="text-gray-900">{faculty.shortName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <p className="text-gray-900">{faculty.phone || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Faculty ID</label>
                <p className="text-gray-900">{faculty.facultyId}</p>
              </div>
            </div>
          </div>

          {/* Academic Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <p className="text-gray-900">{faculty.department}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Designation</label>
                <p className="text-gray-900">{faculty.designation}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <p className="text-gray-900">{faculty.role}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Lectures Per Week</label>
                <p className="text-gray-900">{faculty.maxLecturesPerWeek}</p>
              </div>
            </div>
          </div>

          {/* Subjects */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subjects</h3>
            <div className="flex flex-wrap gap-2">
              {faculty.subjects && faculty.subjects.length > 0 ? (
                faculty.subjects.map((subject, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {subject}
                  </span>
                ))
              ) : (
                <p className="text-gray-500">No subjects assigned</p>
              )}
            </div>
          </div>

          {/* Availability */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Availability</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Days</label>
                <div className="flex flex-wrap gap-2">
                  {faculty.availableDays && faculty.availableDays.length > 0 ? (
                    faculty.availableDays.map((day, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                      >
                        {day}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500">No days specified</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Time Slots</label>
                <div className="flex flex-wrap gap-2">
                  {faculty.preferredTimeSlots && faculty.preferredTimeSlots.length > 0 ? (
                    faculty.preferredTimeSlots.map((slot, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full"
                      >
                        {slot}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500">No time slots specified</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
