'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, db } from '../../../lib/firebase';
import { collection, doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Button } from '../../../components/ui/button';
import Sidebar from '../../../components/sidebar';
import Header from '../../../components/header';
import AssignFacultyModal from '../../../components/AssignFacultyModal';

interface Subject {
  id: string;
  subjectName: string;
  subjectCode: string;
  subjectShortName: string;
  isLaboratory: boolean;
  subjectId: string;
  assignedFaculties: string[];
}

interface Faculty {
  id: string;
  name: string;
  email: string;
  misId: string;
  shortName: string;
  phone?: string;
  department: string;
  designation: string;
  subjects: string[];
  maxLecturesPerWeek: number;
  availableDays: string[];
  preferredTimeSlots: string[];
  status: 'Active' | 'Inactive';
  role: 'Faculty' | 'HOD' | 'Admin';
  facultyId: string;
}

export default function SubjectDetailsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;

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
    if (user && subjectId) {
      // Fetch subject
      const subjectUnsubscribe = onSnapshot(doc(db, 'subjects', subjectId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSubject({
            id: docSnap.id,
            subjectName: String(data.subjectName || ''),
            subjectCode: String(data.subjectCode || ''),
            subjectShortName: String(data.subjectShortName || ''),
            isLaboratory: Boolean(data.isLaboratory || false),
            subjectId: data.subjectId || docSnap.id,
            assignedFaculties: Array.isArray(data.assignedFaculties) ? data.assignedFaculties : []
          } as Subject);
        } else {
          // Subject not found
          router.push('/subjects');
        }
        setLoading(false);
      });

      // Fetch all faculties
      const facultiesUnsubscribe = onSnapshot(collection(db, 'faculty'), (querySnapshot) => {
        const facultyList: Faculty[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          facultyList.push({
            id: doc.id,
            name: data.name || '',
            email: data.email || '',
            misId: data.misId || '',
            shortName: data.shortName || '',
            phone: data.phone || '',
            department: data.department || '',
            designation: data.designation || 'Assistant Professor',
            subjects: Array.isArray(data.subjects) ? data.subjects : [],
            maxLecturesPerWeek: data.maxLecturesPerWeek || 20,
            availableDays: Array.isArray(data.availableDays) ? data.availableDays : [],
            preferredTimeSlots: Array.isArray(data.preferredTimeSlots) ? data.preferredTimeSlots : [],
            status: data.status || 'Active',
            role: data.role || 'Faculty',
            facultyId: data.facultyId || doc.id
          } as Faculty);
        });
        setFaculties(facultyList);
      });

      return () => {
        subjectUnsubscribe();
        facultiesUnsubscribe();
      };
    }
  }, [user, subjectId, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleAssignFaculty = async (facultyIds: string[]) => {
    if (!subject || facultyIds.length === 0) return;

    try {
      // Add all faculties to subject's assignedFaculties
      await updateDoc(doc(db, 'subjects', subject.id), {
        assignedFaculties: arrayUnion(...facultyIds)
      });

      // Add subject to each faculty's subjects list
      const facultyUpdates = facultyIds.map(facultyId => 
        updateDoc(doc(db, 'faculty', facultyId), {
          subjects: arrayUnion(subject.subjectName)
        })
      );
      await Promise.all(facultyUpdates);
    } catch (error) {
      console.error('Error assigning faculty:', error);
      alert('Error assigning faculty. Please try again.');
    }
  };

  const handleUnassignFaculty = async (facultyId: string) => {
    if (!subject) return;

    try {
      // Remove faculty from subject's assignedFaculties
      await updateDoc(doc(db, 'subjects', subject.id), {
        assignedFaculties: arrayRemove(facultyId)
      });

      // Remove subject from faculty's subjects
      await updateDoc(doc(db, 'faculty', facultyId), {
        subjects: arrayRemove(subject.subjectName)
      });
    } catch (error) {
      console.error('Error unassigning faculty:', error);
      alert('Error unassigning faculty. Please try again.');
    }
  };

  if (!user || loading) {
    return <div>Loading...</div>;
  }

  if (!subject) {
    return <div>Subject not found.</div>;
  }

  const assignedFaculties = faculties.filter(faculty => subject.assignedFaculties.includes(faculty.id));
  const availableFaculties = faculties.filter(faculty => !subject.assignedFaculties.includes(faculty.id));

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <div className="flex-1 ml-64">
        <Header user={user} onLogout={handleLogout} />
        <main className="p-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={() => router.push('/subjects')}
                className="flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Subjects</span>
              </Button>
            </div>

            {/* Subject Header */}
            <div className="bg-white p-8 rounded-lg shadow-md mb-8">
              <div className="flex items-center space-x-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl ${
                  subject.isLaboratory ? 'bg-blue-500' : 'bg-green-500'
                }`}>
                  {subject.subjectShortName || subject.subjectName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{subject.subjectName}</h1>
                  <p className="text-xl text-gray-600">{subject.subjectCode}</p>
                  <span className={`inline-block px-3 py-1 text-sm rounded-full mt-2 ${
                    subject.isLaboratory ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {subject.isLaboratory ? 'Laboratory' : 'Lecture'}
                  </span>
                </div>
              </div>
            </div>

            {/* Assigned Faculties */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Assigned Faculties</h2>

              {/* Add Faculty Card */}
              <div className="mb-6">
                <div
                  className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => setIsAssignModalOpen(true)}
                >
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                    +
                  </div>
                  <p className="text-gray-600 font-medium">Assign Faculty</p>
                </div>
              </div>

              {/* Assigned Faculty Cards */}
              {assignedFaculties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assignedFaculties.map((faculty) => (
                    <div key={faculty.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {faculty.shortName || faculty.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate" title={faculty.name}>
                            {faculty.name}
                          </h3>
                          <p className="text-sm text-gray-600 truncate" title={faculty.email}>
                            {faculty.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleUnassignFaculty(faculty.id)}
                        >
                          Unassign
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No faculties assigned to this subject yet.</p>
              )}
            </div>
          </div>

          <AssignFacultyModal
            isOpen={isAssignModalOpen}
            onClose={() => setIsAssignModalOpen(false)}
            availableFaculties={availableFaculties}
            onAssign={handleAssignFaculty}
          />
        </main>
      </div>
    </div>
  );
}
