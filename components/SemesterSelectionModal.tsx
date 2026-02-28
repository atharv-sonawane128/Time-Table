import { Button } from './ui/button';
import { Card } from './ui/card';

interface SemesterSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSemester: (semester: number) => void;
}

export default function SemesterSelectionModal({
  isOpen,
  onClose,
  onSelectSemester,
}: SemesterSelectionModalProps) {
  if (!isOpen) return null;

  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Select Semester</h2>
        <div className="grid grid-cols-2 gap-2">
          {semesters.map((semester) => (
            <Card
              key={semester}
              className="p-4 cursor-pointer hover:bg-gray-50 text-center"
              onClick={() => onSelectSemester(semester)}
            >
              <p className="font-medium">Semester {semester}</p>
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
