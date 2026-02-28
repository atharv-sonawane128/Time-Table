'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../../../../../../../../lib/firebase';
import { Button } from '../../../../../../../../components/ui/button';
import Sidebar from '../../../../../../../../components/sidebar';
import Header from '../../../../../../../../components/header';
import TimetableGrid from '../../../../../../../../components/TimetableGrid';
import { departments } from '../../../../../../../../lib/data';

export default function DivisionTimetablePage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const { id: semId, dept: deptId, division } = useParams();

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

  if (!user) {
    return <div>Loading...</div>;
  }

  const department = departments.find(d => d.id === deptId);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <div className="flex-1 ml-64">
        <Header user={user} onLogout={handleLogout} />
        <main className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <Button onClick={() => router.back()} variant="outline" className="mb-4">
                ← Back
              </Button>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Timetable</h1>
              <p className="text-gray-600">
                {department?.name} | Division: {semId}{department?.letter}{division}
              </p>
            </div>

            {/* Timetable Grid */}
            <TimetableGrid
              semesterId={semId as string}
              departmentId={deptId as string}
              division={division as string}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
