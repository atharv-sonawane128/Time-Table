'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import Sidebar from '../../components/sidebar';
import Header from '../../components/header';
import FacultySelectionModal from '../../components/FacultySelectionModal';
import { institutes, faculties } from '../../lib/data';

export default function TimetablePage() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedInstitute, setSelectedInstitute] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

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

  const handleInstituteClick = (institute: any) => {
    setSelectedInstitute(institute);
    setIsModalOpen(true);
  };

  const handleFacultySelect = (faculty: any) => {
    setIsModalOpen(false);
    // Redirect to department page with institute and faculty id
    if (selectedInstitute) {
      router.push(`/timetables/institute/${selectedInstitute.id}/faculty/${faculty.id}`);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <div className="flex-1 ml-64">
        <Header user={user} onLogout={handleLogout} />
        <main className="p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Timetable Management</h1>
            </div>

            {/* Institute Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {institutes.map((institute) => (
                <Card
                  key={institute.id}
                  className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleInstituteClick(institute)}
                >
                  <h3 className="text-lg font-semibold text-gray-900">{institute.name}</h3>
                  <p className="text-gray-600 mt-2">Click to select faculty</p>
                </Card>
              ))}
            </div>

            {/* Faculty Selection Modal */}
            <FacultySelectionModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              faculties={faculties.filter(faculty => faculty.instituteId === selectedInstitute?.id)}
              onSelectFaculty={handleFacultySelect}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
