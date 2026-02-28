'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';

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

interface AssignFacultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableFaculties: Faculty[];
  onAssign: (facultyId: string) => Promise<void>;
}

export default function AssignFacultyModal({ isOpen, onClose, availableFaculties, onAssign }: AssignFacultyModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedFaculty(null);
      setIsAssigning(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const filteredFaculties = availableFaculties.filter(faculty => {
    const searchLower = searchQuery.toLowerCase();
    return (
      String(faculty.name || '').toLowerCase().includes(searchLower) ||
      String(faculty.email || '').toLowerCase().includes(searchLower) ||
      String(faculty.misId || '').toLowerCase().includes(searchLower) ||
      String(faculty.department || '').toLowerCase().includes(searchLower)
    );
  });

  const handleAssign = async () => {
    if (!selectedFaculty) return;

    setIsAssigning(true);
    try {
      await onAssign(selectedFaculty.id);
      onClose();
    } catch (error) {
      console.error('Error assigning faculty:', error);
      alert('Error assigning faculty. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Assign Faculty</h2>
            <p className="text-gray-600 mt-1">Select a faculty member to assign to this subject</p>
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
          {/* Search */}
          <div className="mb-6">
            <Input
              placeholder="Search faculty by name, email, MIS ID, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Faculty List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredFaculties.length > 0 ? (
              filteredFaculties.map((faculty) => (
                <div
                  key={faculty.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedFaculty?.id === faculty.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedFaculty(faculty)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {faculty.shortName || faculty.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate" title={faculty.name}>
                        {faculty.name}
                      </h3>
                      <p className="text-sm text-gray-600 truncate" title={faculty.email}>
                        {faculty.email}
                      </p>
                      <p className="text-sm text-gray-500">
                        {faculty.department} - {faculty.designation}
                      </p>
                      <p className="text-sm text-gray-500">MIS ID: {faculty.misId}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedFaculty?.id === faculty.id
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedFaculty?.id === faculty.id && (
                        <div className="w-full h-full rounded-full bg-white scale-50"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No available faculty members found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isAssigning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedFaculty || isAssigning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isAssigning ? 'Assigning...' : 'Assign Faculty'}
          </Button>
        </div>
      </div>
    </div>
  );
}
