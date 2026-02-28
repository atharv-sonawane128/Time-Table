'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import Sidebar from '../../components/sidebar';
import Header from '../../components/header';
import SummaryCard from '../../components/summary-card';
import BusyFacultyGrid from '../../components/BusyFacultyGrid';

interface SummaryStat {
  title: string;
  count: number;
  icon: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
 
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

  // Fetch real-time data for dashboard stats
 

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
        <main className="p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
          </div>

          

          <BusyFacultyGrid />
        </main>
      </div>
    </div>
  );
}
