'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../../../../../../lib/firebase';
import { Button } from '../../../../../../components/ui/button';
import { Card } from '../../../../../../components/ui/card';
import Sidebar from '../../../../../../components/sidebar';
import Header from '../../../../../../components/header';
import SemesterSelectionModal from '../../../../../../components/SemesterSelectionModal';
import { departments, faculties } from '../../../../../../lib/data';

export default function FacultyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const router = useRouter();
  const { instituteId, facultyId } = useParams();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleDepartmentClick = (department: any) => {
    setSelectedDepartment(department);
    setIsSemesterModalOpen(true);
  };

  const handleSemesterSelect = (semester: number) => {
    setIsSemesterModalOpen(false);
    if (selectedDepartment) {
      router.push(`/timetables/department/${selectedDepartment.id}/semester/${semester}`);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const faculty = faculties.find(f => f.id === facultyId);
  const facultyDepartments = departments.filter(dept => dept.facultyId === facultyId);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <div className="flex-1 ml-64">
        <Header user={user} onLogout={handleLogout} />
        <main className="p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <Button onClick={() => router.back()} variant="outline" className="mb-4">
                ← Back
              </Button>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Departments</h1>
              <p className="text-gray-600">{faculty?.name}</p>
            </div>

            {/* Department Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {facultyDepartments.map((department) => (
                <Card
                  key={department.id}
                  className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleDepartmentClick(department)}
                >
                  <h3 className="text-lg font-semibold text-gray-900">{department.name}</h3>
                  <p className="text-gray-600 mt-2">Click to select semester</p>
                </Card>
              ))}
            </div>

            {/* Semester Selection Modal */}
            <SemesterSelectionModal
              isOpen={isSemesterModalOpen}
              onClose={() => setIsSemesterModalOpen(false)}
              onSelectSemester={handleSemesterSelect}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
