'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';

interface SubjectPreview {
  subject: {
    subjectName: string;
    subjectCode: string;
    subjectShortName: string;
    isLaboratory: boolean;
    subjectId: string;
    assignedFaculties: string[];
  };
  isDuplicate: boolean;
}

interface SubjectExcelPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectData: SubjectPreview[];
  onImport: (selectedSubjects: {subjectName: string; subjectCode: string; subjectShortName: string; isLaboratory: boolean; subjectId: string; assignedFaculties: string[];}[]) => Promise<void>;
  isImporting: boolean;
}

export default function SubjectExcelPreviewModal({
  isOpen,
  onClose,
  subjectData,
  onImport,
  isImporting
}: SubjectExcelPreviewModalProps) {
  const [selectedSubjects, setSelectedSubjects] = useState<Set<number>>(new Set());

  // Update selected subjects when subjectData changes
  useEffect(() => {
    setSelectedSubjects(new Set(subjectData.filter(item => !item.isDuplicate).map((_, index) => index)));
  }, [subjectData]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableIndices = subjectData
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.isDuplicate)
        .map(({ index }) => index);
      setSelectedSubjects(new Set(selectableIndices));
    } else {
      setSelectedSubjects(new Set());
    }
  };

  const handleSelectSubject = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedSubjects);
    if (checked && !subjectData[index].isDuplicate) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedSubjects(newSelected);
  };

  const handleImport = async () => {
    const selectedData = subjectData.filter((_, index) => selectedSubjects.has(index)).map(item => item.subject);
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
            <h2 className="text-2xl font-bold text-gray-900">Preview Subject Import</h2>
            <p className="text-gray-600 mt-1">
              Review and select subjects to import from Excel
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
          {subjectData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">All subjects in the Excel file are already added to the system.</p>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="mb-6 flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedSubjects.size === subjectData.filter(item => !item.isDuplicate).length && subjectData.filter(item => !item.isDuplicate).length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={subjectData.filter(item => !item.isDuplicate).length === 0}
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({subjectData.filter(item => !item.isDuplicate).length} subjects)
                </span>
              </div>

              {/* Subject Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectData
                  .map((subject, originalIndex) => ({ subject, originalIndex }))
                  .sort((a, b) => {
                    // Sort non-duplicates first, then duplicates
                    if (!a.subject.isDuplicate && b.subject.isDuplicate) return -1;
                    if (a.subject.isDuplicate && !b.subject.isDuplicate) return 1;
                    return 0;
                  })
                  .map(({ subject, originalIndex }) => (
                  <div
                    key={originalIndex}
                    className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative ${
                      selectedSubjects.has(originalIndex) ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                    } ${subject.isDuplicate ? 'opacity-75' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${
                          subject.subject.isLaboratory ? 'bg-blue-500' : 'bg-green-500'
                        }`}>
                          {subject.subject.subjectShortName || subject.subject.subjectName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg truncate" title={subject.subject.subjectName}>{subject.subject.subjectName}</h3>
                          <p className="text-gray-600 text-sm truncate" title={subject.subject.subjectCode}>{subject.subject.subjectCode}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2 flex-shrink-0 ml-2">
                        <input
                          type="checkbox"
                          checked={selectedSubjects.has(originalIndex)}
                          onChange={(e) => handleSelectSubject(originalIndex, e.target.checked)}
                          disabled={subject.isDuplicate}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        />
                        {subject.isDuplicate && (
                          <div className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                            Already present
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <p><strong>Subject ID:</strong> {subject.subject.subjectId}</p>
                      <p><strong>Short Name:</strong> {subject.subject.subjectShortName}</p>
                      <p><strong>Type:</strong> {subject.subject.isLaboratory ? 'Laboratory' : 'Lecture'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {subjectData.length > 0 && (
          <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              {selectedSubjects.size} of {subjectData.filter(item => !item.isDuplicate).length} selectable subjects selected
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose} disabled={isImporting}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedSubjects.size === 0 || isImporting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isImporting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Importing...</span>
                  </div>
                ) : (
                  `Import ${selectedSubjects.size} Subject${selectedSubjects.size !== 1 ? 's' : ''}`
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
              <p className="text-gray-600">Importing subjects...</p>
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
