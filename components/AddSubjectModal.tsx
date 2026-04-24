'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface Subject {
  id: string;
  subjectName: string;
  subjectCode: string;
  subjectShortName: string;
  isLaboratory: boolean;
  subjectId: string;
  assignedFaculties: string[];
  academicYear?: string;
  branch?: string;
  semester?: number;
}

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (subject: Omit<Subject, 'id'>) => Promise<void>;
  editingSubject?: Subject | null;
  academicYear: string;
}

export default function AddSubjectModal({ isOpen, onClose, onAdd, editingSubject, academicYear }: AddSubjectModalProps) {
  const [formData, setFormData] = useState({
    subjectName: '',
    subjectCode: '',
    subjectShortName: '',
    isLaboratory: false,
    subjectId: '',
    branch: '',
    semester: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingSubject) {
      setFormData({
        subjectName: editingSubject.subjectName,
        subjectCode: editingSubject.subjectCode,
        subjectShortName: editingSubject.subjectShortName,
        isLaboratory: editingSubject.isLaboratory,
        subjectId: editingSubject.subjectId,
        branch: editingSubject.branch || '',
        semester: editingSubject.semester ? String(editingSubject.semester) : ''
      });
    } else {
      const newSubjectId = `SUB${Date.now()}`;
      setFormData({
        subjectName: '',
        subjectCode: '',
        subjectShortName: '',
        isLaboratory: false,
        subjectId: newSubjectId,
        branch: '',
        semester: ''
      });
    }
    setErrors({});
  }, [editingSubject, isOpen]);

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
    if (!String(formData.subjectName || '').trim()) newErrors.subjectName = 'Subject Name is required';
    if (!String(formData.subjectCode || '').trim()) newErrors.subjectCode = 'Subject Code is required';
    if (!String(formData.subjectShortName || '').trim()) newErrors.subjectShortName = 'Subject Short Name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Check for duplicate subject code
      const existingSubjects = await getDocs(collection(db, 'subjects'));
      const existingSubjectCodes = existingSubjects.docs.map(doc => doc.data().subjectCode);
      const isDuplicate = existingSubjectCodes.includes(formData.subjectCode) && (!editingSubject || editingSubject.subjectCode !== formData.subjectCode);

      if (isDuplicate) {
        setErrors({ subjectCode: 'A subject with this code already exists.' });
        setIsLoading(false);
        return;
      }

      const subjectData: Omit<Subject, 'id'> = {
        ...formData,
        semester: formData.semester ? Number(formData.semester) : undefined,
        branch: formData.branch.trim() || undefined,
        subjectId: formData.subjectId,
        assignedFaculties: [],
        academicYear,
      };

      await onAdd(subjectData);
      onClose();
    } catch (error) {
      console.error('Error adding subject:', error);
      setErrors({ general: 'Failed to add subject. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

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
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{editingSubject ? 'Edit Subject' : 'Add Subject'}</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-gray-600">Create a new subject for timetable scheduling</p>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">{academicYear}</span>
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

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Basic Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.subjectName}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, subjectName: e.target.value }));
                    if (errors.subjectName) setErrors(prev => ({ ...prev, subjectName: '' }));
                  }}
                  className={errors.subjectName ? 'border-red-500' : ''}
                  placeholder="Enter subject name"
                />
                {errors.subjectName && <p className="text-red-500 text-sm mt-1">{errors.subjectName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Code <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.subjectCode}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, subjectCode: e.target.value }));
                    if (errors.subjectCode) setErrors(prev => ({ ...prev, subjectCode: '' }));
                  }}
                  className={errors.subjectCode ? 'border-red-500' : ''}
                  placeholder="Enter subject code"
                />
                {errors.subjectCode && <p className="text-red-500 text-sm mt-1">{errors.subjectCode}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Short Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.subjectShortName}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, subjectShortName: e.target.value }));
                    if (errors.subjectShortName) setErrors(prev => ({ ...prev, subjectShortName: '' }));
                  }}
                  className={errors.subjectShortName ? 'border-red-500' : ''}
                  placeholder="Enter short name (e.g., DS)"
                />
                {errors.subjectShortName && <p className="text-red-500 text-sm mt-1">{errors.subjectShortName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject ID
                </label>
                <Input
                  value={formData.subjectId}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch
                </label>
                <Input
                  value={formData.branch}
                  onChange={(e) => setFormData(prev => ({ ...prev, branch: e.target.value }))}
                  placeholder="Enter branch (e.g., Computer Science)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Semester
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.semester}
                  onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                  placeholder="Enter semester number"
                />
              </div>
            </div>
          </div>

          {/* Laboratory Checkbox */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Type</h3>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isLaboratory"
                checked={formData.isLaboratory}
                onChange={(e) => setFormData(prev => ({ ...prev, isLaboratory: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isLaboratory" className="text-sm font-medium text-gray-700">
                This is a laboratory subject
              </label>
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
            disabled={isLoading || !String(formData.subjectName || '').trim() || !String(formData.subjectCode || '').trim() || !String(formData.subjectShortName || '').trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Adding Subject...' : editingSubject ? 'Update Subject' : 'Add Subject'}
          </Button>
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Adding subject...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
