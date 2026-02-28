'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../../../../../../lib/firebase';
import { Button } from '../../../../../../components/ui/button';
import { Card } from '../../../../../../components/ui/card';
import Sidebar from '../../../../../../components/sidebar';
import Header from '../../../../../../components/header';
import TimetableGrid from '../../../../../../components/TimetableGrid';
import { departments } from '../../../../../../lib/data';

export default function SemesterPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const { deptId, semId } = useParams();

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

  const handleDivisionClick = (division: string) => {
    // Navigate to division timetable page
    router.push(`/timetable/semester/${semId}/department/${deptId}/division/${division}`);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const department = departments.find(d => d.id === deptId);
  const divisions = department?.divisions || [];

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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Divisions</h1>
              <p className="text-gray-600">{department?.name} | Semester: {semId}</p>
            </div>

            {/* Division Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {divisions.map((division) => (
                <Card
                  key={division}
                  className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleDivisionClick(division)}
                >
                  <h3 className="text-lg font-semibold text-gray-900">
                    {semId}{department?.letter}{division}
                  </h3>
                  <p className="text-gray-600 mt-2">Click to view timetable</p>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
