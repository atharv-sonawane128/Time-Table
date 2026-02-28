import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface Faculty {
  id: string;
  name: string;
  instituteId: string;
}

interface FacultySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  faculties: Faculty[];
  onSelectFaculty: (faculty: Faculty) => void;
}

export default function FacultySelectionModal({
  isOpen,
  onClose,
  faculties,
  onSelectFaculty,
}: FacultySelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Select Faculty</h2>
        <div className="space-y-2">
          {faculties.map((faculty) => (
            <Card
              key={faculty.id}
              className="p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => onSelectFaculty(faculty)}
            >
              <p className="font-medium">{faculty.name}</p>
            </Card>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
