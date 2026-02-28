'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, db } from '../../../lib/firebase';
import { ArrowLeft } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';

import Sidebar from '../../../components/sidebar';
import Header from '../../../components/header';
import FacultyMasterGrid from '../../../components/FacultyMasterGrid';

interface Faculty {
  id: string;
  name: string;
  shortName: string;
  facultyId: string;
}

interface Assignment {
  subject: {
    subjectShortName: string;
    subjectCode: string;
  };
  faculty: {
    id: string;
    shortName: string;
  };
  room: {
    roomNumber: string;
  };
  timeSlot: string;
  day: string;
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeSlots = [
  '07:30 – 08:25', '08:25 – 09:20', '09:30 – 10:25', '10:25 – 11:20',
  '12:20 – 01:15', '01:15 – 02:10', '02:30 – 03:25', '03:25 – 04:20'
];

export default function FacultyMasterPage() {
  const [user, setUser] = useState<User | null>(null);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
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

  useEffect(() => {
    if (!user) return;

    // Fetch faculty
    const facultyUnsubscribe = onSnapshot(collection(db, 'faculty'), (snapshot) => {
      const facultyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Faculty[];
      setFaculty(facultyData);
    });

    // Fetch all assignments from all timetables
    const timetablesUnsubscribe = onSnapshot(collection(db, 'timetables'), (snapshot) => {
      const allAssignments: Assignment[] = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.assignments) {
          allAssignments.push(...data.assignments);
        }
      });
      setAssignments(allAssignments);
    });

    return () => {
      facultyUnsubscribe();
      timetablesUnsubscribe();
    };
  }, [user]);

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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Faculty Master</h2>
            <p className="text-gray-600">View faculty assignments across all timetables</p>
          </div>

          <FacultyMasterGrid />
        </main>
      </div>
    </div>
  );
}
