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
import AddSubjectModal from '../../components/AddSubjectModal';
import SubjectExcelPreviewModal from '../../components/SubjectExcelPreviewModal';
import * as XLSX from 'xlsx';

interface Subject {
  id: string;
  subjectName: string;
  subjectCode: string;
  subjectShortName: string;
  isLaboratory: boolean;
  subjectId: string;
  assignedFaculties: string[];
  semester?: number;
  academicYear?: string;
  branch?: string;
}

export default function SubjectsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewSubjectData, setPreviewSubjectData] = useState<{ subject: Omit<Subject, 'id'>, isDuplicate: boolean }[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2026-27');
  const [semesterType, setSemesterType] = useState<'all' | 'odd' | 'even'>('all');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const academicYears = ['2025-26', '2026-27', '2027-28', '2028-29'];

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
    if (user) {
      const unsubscribe = onSnapshot(collection(db, 'subjects'), (querySnapshot) => {
        const subjectList: Subject[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          subjectList.push({
            id: doc.id,
            subjectName: String(data.subjectName || ''),
            subjectCode: String(data.subjectCode || ''),
            subjectShortName: String(data.subjectShortName || ''),
            isLaboratory: Boolean(data.isLaboratory || false),
            subjectId: data.subjectId || doc.id,
            assignedFaculties: Array.isArray(data.assignedFaculties) ? data.assignedFaculties : [],
            semester: data.semester ? Number(data.semester) : undefined,
            academicYear: data.academicYear || undefined,
            branch: data.branch || undefined,
          } as Subject);
        });
        setSubjects(subjectList);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleAddSubject = async (subjectData: Omit<Subject, 'id'>) => {
    await addDoc(collection(db, 'subjects'), subjectData);
    setIsModalOpen(false);
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const handleUpdateSubject = async (subjectData: Omit<Subject, 'id'>) => {
    if (editingSubject) {
      await updateDoc(doc(db, 'subjects', editingSubject.id), subjectData);
      setEditingSubject(null);
      setIsModalOpen(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (confirm('Are you sure you want to delete this subject?')) {
      await deleteDoc(doc(db, 'subjects', subjectId));
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
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet) as any[];

      // Normalize row keys to handle potential whitespace and case differences in headers
      const normalizedJsonData = jsonData.map(row => {
        const newRow: any = {};
        for (const key in row) {
          newRow[key.trim().toUpperCase()] = row[key];
        }
        return newRow;
      });

      // Parse and validate subject data
      const subjectData: Omit<Subject, 'id'>[] = normalizedJsonData
        .map((row: any) => ({
          subjectName: String(row.SUBJECT_NAME || row.SUBJECTNAME || '').trim(),
          subjectCode: String(row.SUBJECT_CODE || row.SUBJECTCODE || '').trim(),
          subjectShortName: String(row.SUBJECT_SHORT_NAME || row.SUBJECTSHORTNAME || '').trim(),
          isLaboratory: String(row.LABORATORY || '').toLowerCase() === 'yes' || row.LABORATORY === true,
          subjectId: String(row['SUBJECT ID'] || row.SUBJECTID || `SUB${Date.now() + Math.random()}`),
          assignedFaculties: [],
          semester: row.SEMESTER ? Number(row.SEMESTER) : undefined,
          academicYear: row.ACY ? String(row.ACY).trim() : selectedAcademicYear,
          branch: row.BRANCH ? String(row.BRANCH).trim() : undefined,
        }))
        .filter(subject => subject.subjectCode && subject.subjectName); // Filter out invalid rows

      if (subjectData.length === 0) {
        alert('No valid subjects found in the Excel file. Please check the file format.');
        return;
      }

      // Get existing subject codes from database (case-insensitive)
      const existingSubjectCodes = subjects.map(s => String(s.subjectCode).trim().toLowerCase());

      // Track seen codes within Excel file (case-insensitive)
      const seenCodesInExcel = new Set<string>();

      // Mark duplicates (both from database and within Excel file)
      const previewData = subjectData.map(subject => {
        const subjectCodeLower = subject.subjectCode.toLowerCase();

        // Check if duplicate exists in database
        const isDuplicateInDB = existingSubjectCodes.includes(subjectCodeLower);

        // Check if duplicate exists within Excel file
        const isDuplicateInExcel = seenCodesInExcel.has(subjectCodeLower);

        // Add to seen codes
        seenCodesInExcel.add(subjectCodeLower);

        return {
          subject,
          isDuplicate: isDuplicateInDB || isDuplicateInExcel
        };
      });

      setPreviewSubjectData(previewData);
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

  const handlePreviewImport = async (selectedSubjects: Omit<Subject, 'id'>[]) => {
    setIsImporting(true);
    try {
      const promises = selectedSubjects.map(data => addDoc(collection(db, 'subjects'), {
        ...data,
        academicYear: data.academicYear || selectedAcademicYear,
        branch: data.branch || undefined,
      }));
      await Promise.all(promises);
      alert(`Successfully imported ${selectedSubjects.length} subjects!`);
    } catch (error) {
      console.error('Error importing subjects:', error);
      alert('Error importing subjects. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  // Filter subjects by selected academic year
  const yearFilteredSubjects = subjects.filter(
    s => !s.academicYear || s.academicYear === selectedAcademicYear
  );

  // Filter by branch
  const branchFilteredSubjects = yearFilteredSubjects.filter(
    s => selectedBranch === 'All' || s.branch === selectedBranch
  );

  // Filter by even/odd semester parity
  const filteredSubjects = branchFilteredSubjects.filter(s => {
    if (semesterType === 'all') return true;
    if (!s.semester) return false;
    return semesterType === 'even' ? s.semester % 2 === 0 : s.semester % 2 !== 0;
  });

  // Get unique semesters and sort them
  const uniqueSemesters = Array.from(new Set(filteredSubjects.map(s => s.semester).filter(Boolean))) as number[];
  uniqueSemesters.sort((a, b) => a - b);

  // Get unique branches for the dropdown
  const uniqueBranches = Array.from(new Set(subjects.map(s => s.branch).filter(Boolean))) as string[];

  // Function to get filtered subjects for a semester
  const getSubjectsBySemester = (semesterId: number) => {
    return filteredSubjects.filter(
      s =>
        s.semester === semesterId &&
        (s.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.subjectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.subjectShortName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const getSubjectsWithoutSemester = () => {
    return filteredSubjects.filter(
      s =>
        !s.semester &&
        (s.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.subjectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.subjectShortName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <div className="flex-1 ml-64">
        <Header user={user} onLogout={handleLogout} />
        <main className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search subjects by name, code, or short name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
              {/* Academic Year Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Academic Year:</label>
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {academicYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              {/* Branch Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Branch:</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="All">All</option>
                  {uniqueBranches.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>
              {/* Even / Odd semester toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {(['all', 'odd', 'even'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setSemesterType(type)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors capitalize ${semesterType === type
                      ? 'bg-white shadow text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {type === 'all' ? 'All' : type === 'odd' ? 'Odd' : 'Even'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/subjects_format.xlsx';
                  link.download = 'subjects_format.xlsx';
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
              <Button onClick={() => setIsModalOpen(true)}>Add New Subject</Button>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleExcelImport}
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
          />

          {/* Semesters Sections */}
          {uniqueSemesters.map((semester) => {
            const semesterSubjects = getSubjectsBySemester(semester);
            const semesterLectures = semesterSubjects.filter(s => !s.isLaboratory);
            const semesterLabs = semesterSubjects.filter(s => s.isLaboratory);

            return (
              <div key={semester} className="mb-16">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Semester {semester}</h1>

                {/* Lectures Section */}
                {semesterLectures.length > 0 && (
                  <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Lectures</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {semesterLectures.map((subject) => (
                        <div
                          key={subject.id}
                          className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => router.push(`/subjects/${subject.id}`)}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                                {subject.subjectShortName || subject.subjectName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-semibold truncate" title={subject.subjectName}>{subject.subjectName}</h3>
                                <p className="text-gray-600 truncate" title={subject.subjectCode}>{subject.subjectCode}</p>
                              </div>
                            </div>
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex-shrink-0 ml-2">
                              Lecture
                            </span>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditSubject(subject);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubject(subject.id);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Labs Section */}
                {semesterLabs.length > 0 && (
                  <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Labs</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {semesterLabs.map((subject) => (
                        <div
                          key={subject.id}
                          className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => router.push(`/subjects/${subject.id}`)}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                                {subject.subjectShortName || subject.subjectName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-semibold truncate" title={subject.subjectName}>{subject.subjectName}</h3>
                                <p className="text-gray-600 truncate" title={subject.subjectCode}>{subject.subjectCode}</p>
                              </div>
                            </div>
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 flex-shrink-0 ml-2">
                              Lab
                            </span>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditSubject(subject);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubject(subject.id);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {semesterLectures.length === 0 && semesterLabs.length === 0 && (
                  <p className="text-gray-500">No subjects found for Semester {semester}.</p>
                )}
              </div>
            );
          })}

          {/* Subjects without semester */}
          {getSubjectsWithoutSemester().length > 0 && (
            <div className="mb-16">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">Other Subjects</h1>

              {getSubjectsWithoutSemester().filter(s => !s.isLaboratory).length > 0 && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Lectures</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {getSubjectsWithoutSemester()
                      .filter(s => !s.isLaboratory)
                      .map((subject) => (
                        <div
                          key={subject.id}
                          className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => router.push(`/subjects/${subject.id}`)}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                                {subject.subjectShortName || subject.subjectName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-semibold truncate" title={subject.subjectName}>{subject.subjectName}</h3>
                                <p className="text-gray-600 truncate" title={subject.subjectCode}>{subject.subjectCode}</p>
                              </div>
                            </div>
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex-shrink-0 ml-2">
                              Lecture
                            </span>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditSubject(subject);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubject(subject.id);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {getSubjectsWithoutSemester().filter(s => s.isLaboratory).length > 0 && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Labs</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {getSubjectsWithoutSemester()
                      .filter(s => s.isLaboratory)
                      .map((subject) => (
                        <div
                          key={subject.id}
                          className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => router.push(`/subjects/${subject.id}`)}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                                {subject.subjectShortName || subject.subjectName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-semibold truncate" title={subject.subjectName}>{subject.subjectName}</h3>
                                <p className="text-gray-600 truncate" title={subject.subjectCode}>{subject.subjectCode}</p>
                              </div>
                            </div>
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 flex-shrink-0 ml-2">
                              Lab
                            </span>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditSubject(subject);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubject(subject.id);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <AddSubjectModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingSubject(null);
            }}
            onAdd={editingSubject ? handleUpdateSubject : handleAddSubject}
            editingSubject={editingSubject}
            academicYear={selectedAcademicYear}
          />

          <SubjectExcelPreviewModal
            isOpen={isPreviewModalOpen}
            onClose={() => setIsPreviewModalOpen(false)}
            subjectData={previewSubjectData}
            onImport={handlePreviewImport}
            isImporting={isImporting}
          />
        </main>
      </div>
    </div>
  );
}
