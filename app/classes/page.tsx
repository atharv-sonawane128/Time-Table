'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../../lib/firebase';

import Sidebar from '../../components/sidebar';
import Header from '../../components/header';
import ClassOccupancyGrid from '../../components/ClassOccupancyGrid';
import ClassLoadShiftGrid from '../../components/ClassLoadShiftGrid';

export default function ClassesPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <div className="flex-1 ml-64">
        <Header user={user} onLogout={handleLogout} />
        <main className="p-8 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Classes</h2>
            <p className="text-gray-600">Real-time class occupancy and availability</p>
          </div>
          <ClassOccupancyGrid />
          <ClassLoadShiftGrid />
        </main>
      </div>
    </div>
  );
}
