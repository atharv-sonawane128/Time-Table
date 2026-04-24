'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import Sidebar from '../../components/sidebar';
import Header from '../../components/header';
import AddFacultyModal from '../../components/AddFacultyModal';
import ExcelPreviewModal from '../../components/ExcelPreviewModal';
import FacultyProfileModal from '../../components/FacultyProfileModal';
import * as XLSX from 'xlsx';

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

export default function FacultyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewFacultyData, setPreviewFacultyData] = useState<{faculty: Omit<Faculty, 'id'>, isDuplicate: boolean}[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/');
      }
    });

    // Fetch assignments to calculate workload
    const unsubscribeTimetables = onSnapshot(collection(db, 'timetables'), (querySnapshot) => {
      const assignments: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.assignments && Array.isArray(data.assignments)) {
          assignments.push(...data.assignments);
        }
      });
      setAllAssignments(assignments);
    });

    return () => {
      unsubscribe();
      unsubscribeTimetables();
    };
  }, [router]);

  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(collection(db, 'faculty'), (querySnapshot) => {
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
      return () => unsubscribe();
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleAddFaculty = async (facultyData: Omit<Faculty, 'id'>) => {
    await addDoc(collection(db, 'faculty'), facultyData);
    setIsModalOpen(false);
  };

  const handleEditFaculty = (faculty: Faculty) => {
    setEditingFaculty(faculty);
    setIsModalOpen(true);
  };

  const handleUpdateFaculty = async (facultyData: Omit<Faculty, 'id'>) => {
    if (editingFaculty) {
      await updateDoc(doc(db, 'faculty', editingFaculty.id), facultyData);
      setEditingFaculty(null);
      setIsModalOpen(false);
    }
  };

  const handleDeleteFaculty = async (facultyId: string) => {
    if (confirm('Are you sure you want to delete this faculty member?')) {
      await deleteDoc(doc(db, 'faculty', facultyId));
    }
  };

  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Parse and validate faculty data
      const facultyData: Omit<Faculty, 'id'>[] = jsonData
        .map((row: any) => ({
          name: String(row.FACULTY_NAME || row.Name || row.name || '').trim(),
          email: String(row.EMAIL_ID || row.Email || row.email || '').trim(),
          misId: String(row.MIS_ID || row.misId || '').trim(),
          shortName: String(row.FACULTY_SHORT_NAME || row.shortName || '').trim(),
          phone: String(row.Phone || row.phone || '').trim(),
          department: String(row.Department || row.department || '').trim(),
          designation: row.Designation || row.designation || 'Assistant Professor',
          subjects: typeof row.Subjects === 'string' ? row.Subjects.split(',').map((s: string) => s.trim()) : [],
          maxLecturesPerWeek: parseInt(row['Max Lectures Per Week'] || row.maxLecturesPerWeek || '20') || 20,
          availableDays: typeof row['Available Days'] === 'string' ? row['Available Days'].split(',').map((d: string) => d.trim()) : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          preferredTimeSlots: typeof row['Preferred Time Slots'] === 'string' ? row['Preferred Time Slots'].split(',').map((t: string) => t.trim()) : [],
          status: row.Status || row.status || 'Active',
          role: row.Role || row.role || 'Faculty',
          facultyId: row['Faculty ID'] || row.facultyId || `FAC${Date.now() + Math.random()}`
        }))
        .filter(faculty => faculty.misId && faculty.name); // Filter out invalid rows

      if (facultyData.length === 0) {
        alert('No valid faculty found in the Excel file. Please check the file format.');
        return;
      }

      // Get existing MIS IDs from database (case-insensitive)
      const existingMisIds = faculties.map(f => String(f.misId).trim().toLowerCase());
      
      // Track seen MIS IDs within Excel file (case-insensitive)
      const seenMisIdsInExcel = new Set<string>();
      
      // Mark duplicates (both from database and within Excel file)
      const previewData = facultyData.map(faculty => {
        const misIdLower = faculty.misId.toLowerCase();
        
        // Check if duplicate exists in database
        const isDuplicateInDB = existingMisIds.includes(misIdLower);
        
        // Check if duplicate exists within Excel file
        const isDuplicateInExcel = seenMisIdsInExcel.has(misIdLower);
        
        // Add to seen MIS IDs
        seenMisIdsInExcel.add(misIdLower);
        
        return {
          faculty,
          isDuplicate: isDuplicateInDB || isDuplicateInExcel
        };
      });

      setPreviewFacultyData(previewData);
      setIsPreviewModalOpen(true);
    } catch (error) {
      console.error('Error importing Excel file:', error);
      alert('Error importing Excel file. Please check the file format.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handlePreviewImport = async (selectedFaculty: {name: string; email: string; phone?: string; department: string; designation: string; subjects: string[]; maxLecturesPerWeek: number; availableDays: string[]; preferredTimeSlots: string[]; status: string; role: string; facultyId: string;}[]) => {
    setIsImporting(true);
    try {
      const promises = selectedFaculty.map(data => addDoc(collection(db, 'faculty'), data));
      await Promise.all(promises);
      alert(`Successfully imported ${selectedFaculty.length} faculty members!`);
    } catch (error) {
      console.error('Error importing faculty:', error);
      alert('Error importing faculty. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleViewProfile = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setIsProfileModalOpen(true);
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
          <div className="flex justify-between items-center mb-8">
          <div className="w-46">
            <Input
              placeholder="Search faculty by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/faculty_format.xlsx';
                  link.download = 'faculty_format.xlsx';
                  link.click();
                }}
              >
                Download Format
              </Button>
              <Button
                variant="outline"
                onClick={handleImportClick}
                disabled={isImporting}
              >
                {isImporting ? 'Importing...' : 'Import from Excel'}
              </Button>
              <Button onClick={() => setIsModalOpen(true)}>Add New Faculty</Button>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleExcelImport}
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
          />

         

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {faculties
              .filter((faculty) =>
                faculty.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((faculty) => {
                const workload = allAssignments.filter(a => a.faculty && a.faculty.facultyId === faculty.facultyId).length;
                return (
              <div key={faculty.id} className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleViewProfile(faculty)}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-red-400 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {faculty.shortName || faculty.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold truncate" title={faculty.name}>{faculty.name}</h3>
                      <p className="text-gray-600 truncate" title={faculty.email}>{faculty.email}</p>
                      <p className="text-gray-500 text-sm">MIS ID: {faculty.misId}</p>
                      <p className="text-gray-500 text-sm truncate" title={`${faculty.department} - ${faculty.designation}`}>{faculty.department} - {faculty.designation}</p>
                      <p className="text-blue-600 font-medium text-sm mt-1">Workload: {workload}/{faculty.maxLecturesPerWeek} hrs/week</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ml-2 ${faculty.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {faculty.status}
                  </span>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditFaculty(faculty);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFaculty(faculty.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )})}
          </div>

          <AddFacultyModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingFaculty(null);
            }}
            onAdd={editingFaculty ? handleUpdateFaculty : handleAddFaculty}
            editingFaculty={editingFaculty}
          />

          <ExcelPreviewModal
            isOpen={isPreviewModalOpen}
            onClose={() => setIsPreviewModalOpen(false)}
            facultyData={previewFacultyData}
            onImport={handlePreviewImport}
            isImporting={isImporting}
          />

          <FacultyProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => {
              setIsProfileModalOpen(false);
              setSelectedFaculty(null);
            }}
            faculty={selectedFaculty}
          />
        </main>
      </div>
    </div>
  );
}
