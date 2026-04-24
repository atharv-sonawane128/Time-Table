'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';

interface FacultyPreview {
  faculty: {
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
    role: 'Faculty' | 'HOD' | 'Admin'|'Principal'|'Timetable Cordinator';
    facultyId: string;
  };
  isDuplicate: boolean;
}

interface ExcelPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  facultyData: FacultyPreview[];
  onImport: (selectedFaculty: {name: string; email: string; misId: string; shortName: string; phone?: string; department: string; designation: string; subjects: string[]; maxLecturesPerWeek: number; availableDays: string[]; preferredTimeSlots: string[]; status: string; role: string; facultyId: string;}[]) => Promise<void>;
  isImporting: boolean;
}

export default function ExcelPreviewModal({
  isOpen,
  onClose,
  facultyData,
  onImport,
  isImporting
}: ExcelPreviewModalProps) {
  const [selectedFaculty, setSelectedFaculty] = useState<Set<number>>(
    new Set(facultyData.filter(item => !item.isDuplicate).map((_, index) => index))
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFaculty(new Set(facultyData.filter(item => !item.isDuplicate).map((_, index) => index)));
    } else {
      setSelectedFaculty(new Set());
    }
  };

  const handleSelectFaculty = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedFaculty);
    if (checked && !facultyData[index].isDuplicate) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedFaculty(newSelected);
  };

  const handleImport = async () => {
    const selectedData = facultyData.filter((_, index) => selectedFaculty.has(index)).map(item => item.faculty);
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
            <h2 className="text-2xl font-bold text-gray-900">Preview Faculty Import</h2>
            <p className="text-gray-600 mt-1">
              Review and select faculty members to import from Excel
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
          {facultyData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">All faculty members in the Excel file are already added to the system.</p>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="mb-6 flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedFaculty.size === facultyData.filter(item => !item.isDuplicate).length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({selectedFaculty.size} of {facultyData.filter(item => !item.isDuplicate).length} selectable faculty selected)
                </span>
              </div>

              {/* Faculty Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {facultyData.map((faculty, index) => (
                  <div
                    key={index}
                    className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative ${
                      selectedFaculty.has(index) ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                    } ${faculty.isDuplicate ? 'opacity-75' : ''}`}
                  >
                    {faculty.isDuplicate && (
                      <div className="absolute top-2 right-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        Faculty already present
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {faculty.faculty.shortName || faculty.faculty.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg truncate" title={faculty.faculty.name}>{faculty.faculty.name}</h3>
                          <p className="text-gray-600 text-sm truncate" title={faculty.faculty.email}>{faculty.faculty.email}</p>
                          <p className="text-gray-500 text-sm truncate" title={`${faculty.faculty.department} - ${faculty.faculty.designation}`}>{faculty.faculty.department} - {faculty.faculty.designation}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedFaculty.has(index)}
                        onChange={(e) => handleSelectFaculty(index, e.target.checked)}
                        disabled={faculty.isDuplicate}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 flex-shrink-0 ml-2"
                      />
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      {faculty.faculty.phone && <p><strong>Phone:</strong> {faculty.faculty.phone}</p>}
                      <p><strong>Subjects:</strong> {faculty.faculty.subjects.join(', ') || 'None'}</p>
                      <p><strong>Available Days:</strong> {faculty.faculty.availableDays.join(', ') || 'None'}</p>
                      <p><strong>Max Lectures:</strong> {faculty.faculty.maxLecturesPerWeek} per week</p>
                      <p><strong>Status:</strong> {faculty.faculty.status}</p>
                      <p><strong>Role:</strong> {faculty.faculty.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {facultyData.length > 0 && (
          <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              {selectedFaculty.size} of {facultyData.length} faculty selected
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose} disabled={isImporting}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedFaculty.size === 0 || isImporting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isImporting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Importing...</span>
                  </div>
                ) : (
                  `Import ${selectedFaculty.size} Faculty`
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
              <p className="text-gray-600">Importing faculty members...</p>
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
