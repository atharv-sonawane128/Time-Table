'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { ArrowLeft } from 'lucide-react';

import Sidebar from '../../../components/sidebar';
import Header from '../../../components/header';
import LabMasterGrid from '../../../components/LabMasterGrid';

export default function LabMasterPage() {
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

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleBack = () => {
    router.push('/reports');
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
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Reports
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Lab Master</h2>
            <p className="text-gray-600">Manage lab information and details</p>
          </div>

          {/* Lab Master Grid */}
          <LabMasterGrid />
        </main>
      </div>
    </div>
  );
}
