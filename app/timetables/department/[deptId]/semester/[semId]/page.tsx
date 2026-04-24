'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, db } from '../../../../../../lib/firebase';
import { Button } from '../../../../../../components/ui/button';
import { Card } from '../../../../../../components/ui/card';
import Sidebar from '../../../../../../components/sidebar';
import Header from '../../../../../../components/header';
import { departments } from '../../../../../../lib/data';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

interface DivisionItem {
  name: string;
  acy: string;
}

export default function SemesterPage() {
  const [user, setUser] = useState<User | null>(null);
  const [divisions, setDivisions] = useState<DivisionItem[]>([]);
  const [isAddingDivision, setIsAddingDivision] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedAcy, setSelectedAcy] = useState('2026-27');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { deptId, semId } = useParams();

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

  // Load divisions from Firestore
  useEffect(() => {
    if (!deptId || !semId) return;

    const loadDivisions = async () => {
      setIsLoading(true);
      try {
        const divDoc = doc(db, 'divisions', `${deptId}_${semId}`);
        const snapshot = await getDoc(divDoc);
        if (snapshot.exists()) {
          const rawDivisions = snapshot.data().divisions || [];
          const mappedDivisions = rawDivisions.map((d: any) => 
            typeof d === 'string' ? { name: d, acy: '2026-27' } : d
          );
          setDivisions(mappedDivisions);
        } else {
          setDivisions([]);
        }
      } catch (err) {
        console.error('Error loading divisions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDivisions();
  }, [deptId, semId]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleDivisionClick = (divisionName: string) => {
    router.push(`/timetable/semester/${semId}/department/${deptId}/division/${divisionName}`);
  };

  const handleAddDivision = async () => {
    const trimmed = newDivisionName.trim();
    if (!trimmed) return;
    
    // Check if duplicate for this selected year
    if (divisions.find(d => d.name === trimmed && d.acy === selectedAcy)) {
      alert('Division already exists for this Academic Year.');
      return;
    }

    setIsSaving(true);
    try {
      const newDivisionItem: DivisionItem = { name: trimmed, acy: selectedAcy };
      const updatedDivisions = [...divisions, newDivisionItem];

      const divDocRef = doc(db, 'divisions', `${deptId}_${semId}`);
      await setDoc(divDocRef, {
        deptId: String(deptId),
        semId: String(semId),
        divisions: updatedDivisions,
      }, { merge: true });

      setDivisions(updatedDivisions);
      setNewDivisionName('');
      setIsAddingDivision(false);
    } catch (err) {
      console.error('Error adding division:', err);
      alert('Failed to add division. Please try again.');
    } finally {
      setIsSaving(false);
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

      const updates: Record<string, DivisionItem[]> = {};

      jsonData.forEach((row: any) => {
        const normalizedRow: any = {};
        for (const key in row) {
          normalizedRow[key.trim().toLowerCase()] = row[key];
        }

        const divName = (normalizedRow['division_name']?.toString() || '').trim();
        const sem = (normalizedRow['semester']?.toString() || '').trim();
        const dept = (normalizedRow['department']?.toString() || '').trim();
        const acy = (normalizedRow['acy']?.toString() || '').trim();

        if (divName && sem && dept && acy) {
          const docKey = `${dept}_${sem}`;
          if (!updates[docKey]) updates[docKey] = [];
          updates[docKey].push({ name: divName, acy: acy });
        }
      });

      if (Object.keys(updates).length === 0) {
        alert("No valid divisions found. Make sure columns 'division_name', 'semester', 'department', 'ACY' exist.");
        return;
      }

      for (const docKey of Object.keys(updates)) {
        const parts = docKey.split('_');
        const dId = parts[0];
        const sId = parts[1];
        
        const ref = doc(db, 'divisions', docKey);
        const snap = await getDoc(ref);
        let existingDivs: any[] = [];
        if (snap.exists()) {
          existingDivs = snap.data().divisions || [];
        }
        
        const migratedDivs = existingDivs.map((d: any) => 
          typeof d === 'string' ? { name: d, acy: '2026-27' } : d
        );
        
        // Merge without duplicating
        updates[docKey].forEach(newItem => {
           if (!migratedDivs.find((d: any) => d.name === newItem.name && d.acy === newItem.acy)) {
              migratedDivs.push(newItem);
           }
        });
        
        await setDoc(ref, {
           deptId: dId,
           semId: sId,
           divisions: migratedDivs
        }, { merge: true });

        // Update local state if currently viewed
        if (dId === deptId && sId === semId) {
          setDivisions(migratedDivs);
        }
      }

      alert('Divisions imported successfully!');
    } catch (error) {
      console.error('Error importing divisions:', error);
      alert('Error importing Excel file. Please check format.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const department = departments.find(d => d.id === deptId);

  // Filter divisions to only show those for the selected ACY and sort them by name
  const displayedDivisions = divisions
    .filter(d => d.acy === selectedAcy)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <div className="flex-1 ml-64">
        <Header user={user} onLogout={handleLogout} />
        <main className="p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <Button onClick={() => router.back()} variant="outline" className="mb-4">
                  ← Back
                </Button>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Divisions</h1>
                <p className="text-gray-600">{department?.name} | Semester: {semId}</p>
              </div>
              <div className="flex flex-col gap-4 mt-10 md:items-end">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Academic Year:</label>
                  <select
                    value={selectedAcy}
                    onChange={(e) => setSelectedAcy(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {academicYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleExcelImport}
                    accept=".xlsx,.xls"
                    className="hidden"
                  />
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = '/divisions_format.xlsx';
                      link.download = 'divisions_format.xlsx';
                      link.click();
                    }}
                  >
                    Download Format
                  </Button>
                  <Button 
                    onClick={handleImportClick} 
                    variant="outline"
                    disabled={isImporting}
                  >
                    {isImporting ? 'Importing...' : 'Import Excel'}
                  </Button>
                  <Button onClick={() => setIsAddingDivision(true)}>
                    + Add Division
                  </Button>
                </div>
              </div>
            </div>

            {/* Add Division Inline Form */}
            {isAddingDivision && (
              <div className="mb-6 p-4 bg-white border border-blue-200 rounded-xl shadow-sm flex items-center gap-4">
                <input
                  type="text"
                  placeholder={`Enter division name for ${selectedAcy} (e.g. A1)`}
                  value={newDivisionName}
                  onChange={e => setNewDivisionName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddDivision();
                    if (e.key === 'Escape') { setIsAddingDivision(false); setNewDivisionName(''); }
                  }}
                  autoFocus
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button onClick={handleAddDivision} disabled={isSaving || !newDivisionName.trim()}>
                  {isSaving ? 'Adding...' : 'Add'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setIsAddingDivision(false); setNewDivisionName(''); }}
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Division Cards */}
            {isLoading ? (
              <div className="text-gray-500 text-sm">Loading divisions...</div>
            ) : displayedDivisions.length === 0 ? (
              <div className="text-center py-16 text-gray-400 bg-white border border-dashed border-gray-300 rounded-xl">
                <p className="text-lg font-medium">No divisions found for {selectedAcy}</p>
                <p className="text-sm mt-2">Click "Add Division" to create one or import from Excel.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedDivisions.map((division) => (
                  <Card
                    key={`${division.name}-${division.acy}`}
                    className="p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 bg-white"
                    onClick={() => handleDivisionClick(division.name)}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-gray-900">
                        {division.name}
                      </h3>
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        {division.acy}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm mt-3">Click to view timetable</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
