import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { collection, doc, setDoc, getDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import TimetableCellModal from '@/components/TimetableCellModal';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Search, Lock, X } from 'lucide-react';
import { departments, faculties, institutes } from '@/lib/data';

interface TimeSlot {
  time: string;
  type: 'teaching' | 'break';
  breakType?: string;
}

interface ShiftConfig {
  name: string;
  slots: TimeSlot[];
}

const morningShift: ShiftConfig = {
  name: 'Morning Shift',
  slots: [
    { time: '07:30 – 08:25', type: 'teaching' },
    { time: '08:25 – 09:20', type: 'teaching' },
    { time: '09:20 – 09:30', type: 'break', breakType: 'Recess' },
    { time: '09:30 – 10:25', type: 'teaching' },
    { time: '10:25 – 11:20', type: 'teaching' },
    { time: '11:20 – 12:20', type: 'break', breakType: 'Lunch' },
    { time: '12:20 – 01:15', type: 'teaching' },
    { time: '01:15 – 02:10', type: 'teaching' },
  ],
};

const generalShift: ShiftConfig = {
  name: 'General Shift',
  slots: [
    { time: '09:30 – 10:25', type: 'teaching' },
    { time: '10:25 – 11:20', type: 'teaching' },
    { time: '11:20 – 12:20', type: 'break', breakType: 'Lunch' },
    { time: '12:20 – 01:15', type: 'teaching' },
    { time: '01:15 – 02:10', type: 'teaching' },
    { time: '02:10 – 02:30', type: 'break', breakType: 'Recess' },
    { time: '02:30 – 03:25', type: 'teaching' },
    { time: '03:25 – 04:20', type: 'teaching' },
  ],
};

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Assignment {
  subject: any;
  faculty: any;
  room: any;
  timeSlot: string;
  day: string;
}

interface TimetableGridProps {
  semesterId: string;
  departmentId: string;
  division: string;
}

const TimetableGrid: React.FC<TimetableGridProps> = ({ semesterId, departmentId, division }) => {
  const [selectedShift, setSelectedShift] = useState<'morning' | 'general'>('morning');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ timeSlot: string; day: string } | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [academicYear, setAcademicYear] = useState('2026-2027');
  
  const [allFaculties, setAllFaculties] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [allMfts, setAllMfts] = useState<Record<string, { division: string, dept: string, sem: string }>>({});
  const [mft, setMft] = useState<any | null>(null);
  const [isMftDropdownOpen, setIsMftDropdownOpen] = useState(false);
  const [mftSearch, setMftSearch] = useState('');

  const currentShift = selectedShift === 'morning' ? morningShift : generalShift;

  // Load assignments from database on component mount
  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const timetableDocRef = doc(db, 'timetables', `${semesterId}_${departmentId}_${division}`);
        const timetableDoc = await getDoc(timetableDocRef);

        if (timetableDoc.exists()) {
          const data = timetableDoc.data();
          if (data.assignments) {
            setAssignments(data.assignments);
          }
          if (data.academicYear) {
            setAcademicYear(data.academicYear);
          }
          if (data.mft) {
            setMft(data.mft);
          } else {
            setMft(null);
          }
        }
      } catch (error) {
        console.error('Error loading assignments:', error);
      }
    };

    loadAssignments();
  }, [semesterId, departmentId, division]);

  // Load faculties and MFT assignments for conflict detection
  useEffect(() => {
    const unsubscribeFaculties = onSnapshot(collection(db, 'faculty'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllFaculties(list);
    });

    const unsubscribeSubjects = onSnapshot(collection(db, 'subjects'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllSubjects(list);
    });

    const unsubscribeTimetables = onSnapshot(collection(db, 'timetables'), (snap) => {
      const assigned: Record<string, any> = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        // Extract facultyId, accommodating different possible structures
        const mftFacultyId = data.mft?.facultyId || data.mft?.id;
        
        if (mftFacultyId) {
          // Exclude current division from conflict
          if (data.semesterId === semesterId && data.departmentId === departmentId && data.division === division) {
             return;
          }
          assigned[mftFacultyId] = {
             division: data.division,
             deptId: data.departmentId,
             semId: data.semesterId
          };
        }
      });
      setAllMfts(assigned);
    });

    return () => {
      unsubscribeFaculties();
      unsubscribeSubjects();
      unsubscribeTimetables();
    }
  }, [semesterId, departmentId, division]);

  const isLabSubject = (subj: any) => {
    if (!subj) return false;
    if (subj.isLaboratory === true) return true;
    const dbSubject = allSubjects.find(s => s.id === subj.id || s.subjectId === subj.subjectId);
    return dbSubject ? dbSubject.isLaboratory : false;
  };

  const handleCellClick = (timeSlot: string, day: string) => {
    setSelectedCell({ timeSlot, day });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCell(null);
  };

  const assignLectureToSlot = (subject: any, faculty: any, room: any, cell: { timeSlot: string, day: string }) => {
    const newAssignments: Assignment[] = [];

    if (isLabSubject(subject)) {
      const currentSlotIndex = currentShift.slots.findIndex(slot => slot.time === cell.timeSlot);
      if (currentSlotIndex >= 0 && currentSlotIndex < currentShift.slots.length - 1) {
        const nextSlot = currentShift.slots[currentSlotIndex + 1];
        if (nextSlot && nextSlot.type === 'teaching') {
          newAssignments.push({
            subject, faculty, room, timeSlot: cell.timeSlot, day: cell.day
          }, {
            subject, faculty, room, timeSlot: nextSlot.time, day: cell.day
          });
        } else {
          alert("lab is of 2 hrs and can't be assign here");
          return;
        }
      } else {
        alert("lab is of 2 hrs and can't be assign here");
        return;
      }
    } else {
      newAssignments.push({
        subject, faculty, room, timeSlot: cell.timeSlot, day: cell.day
      });
    }

    setAssignments(prev => {
      let updated = [...prev];
      newAssignments.forEach(newAssignment => {
        const existingIndex = prev.findIndex(
          a => a.timeSlot === newAssignment.timeSlot && a.day === newAssignment.day
        );
        if (existingIndex >= 0) {
          updated[existingIndex] = newAssignment;
        } else {
          updated.push(newAssignment);
        }
      });
      return updated;
    });
  };

  const handleCellSelect = (subject: any, faculty: any, room: any) => {
    if (subject && faculty && room && selectedCell) {
      assignLectureToSlot(subject, faculty, room, selectedCell);
    }
    handleModalClose();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validate data before saving
      if (!semesterId || !departmentId || !division) {
        alert('Missing required data. Please refresh the page and try again.');
        return;
      }

      // Clean assignments data to remove any undefined values and ensure all fields are valid
      const cleanAssignments = assignments
        .filter(assignment =>
          assignment.subject &&
          assignment.faculty &&
          assignment.room &&
          assignment.timeSlot &&
          assignment.day
        )
        .map(assignment => ({
          subject: {
            id: String(assignment.subject.id || ''),
            subjectName: String(assignment.subject.subjectName || ''),
            subjectCode: String(assignment.subject.subjectCode || ''),
            subjectShortName: String(assignment.subject.subjectShortName || ''),
            subjectId: String(assignment.subject.subjectId || ''),
            isLaboratory: Boolean(isLabSubject(assignment.subject)),
          },
          faculty: {
            id: String(assignment.faculty.id || ''),
            name: String(assignment.faculty.name || ''),
            shortName: String(assignment.faculty.shortName || ''),
            facultyId: String(assignment.faculty.facultyId || ''),
          },
          room: {
            id: String(assignment.room.id || ''),
            roomNumber: String(assignment.room.roomNumber || ''),
            roomId: String(assignment.room.roomId || ''),
          },
          timeSlot: String(assignment.timeSlot),
          day: String(assignment.day),
        }));

      const timetableDocRef = doc(db, 'timetables', `${semesterId}_${departmentId}_${division}`);
      await setDoc(timetableDocRef, {
        semesterId: String(semesterId),
        departmentId: String(departmentId),
        division: String(division),
        academicYear: String(academicYear),
        assignments: cleanAssignments,
        shift: String(selectedShift || 'morning'),
        mft: mft || null,
        lastUpdated: new Date(),
      });
      alert('Timetable saved successfully!');
    } catch (error) {
      console.error('Error saving timetable:', error);
      alert('Error saving timetable. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset the entire timetable? This will delete all assignments.')) {
      return;
    }

    setIsResetting(true);
    try {
      const timetableDocRef = doc(db, 'timetables', `${semesterId}_${departmentId}_${division}`);
      await deleteDoc(timetableDocRef);
      setAssignments([]);
      alert('Timetable reset successfully!');
    } catch (error) {
      console.error('Error resetting timetable:', error);
      alert('Error resetting timetable. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Timetable');

    for (let i = 1; i <= 6; i++) {
      worksheet.getRow(i).height = 20;
    }

    const applyBorder = (cell: ExcelJS.Cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    };

    const department = await departments.find(d => d.id === departmentId);
    const faculty = await faculties.find(f => f.id === department?.facultyId);
    const institute = await institutes.find(i => i.id === faculty?.instituteId);

    const wefDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const semNum = parseInt(semesterId) || 1;
    let yearStr = "1ST YEAR";
    if (semNum >= 3 && semNum <= 4) yearStr = "2ND YEAR";
    else if (semNum >= 5 && semNum <= 6) yearStr = "3RD YEAR";
    else if (semNum >= 7 && semNum <= 8) yearStr = "4TH YEAR";

    let semOrd = "TH";
    if (semNum === 1) semOrd = "ST";
    else if (semNum === 2) semOrd = "ND";
    else if (semNum === 3) semOrd = "RD";

    const progName = department?.name ? department.name.toUpperCase() : 'COMPUTER SCIENCE ENGINEERING';

    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = 'PARUL UNIVERSITY';
    worksheet.getCell('A1').font = { bold: true };
    worksheet.mergeCells('E1:G1');
    worksheet.getCell('E1').value = `(W.E.F. - ${wefDate})`;
    worksheet.getCell('E1').font = { bold: true };
    worksheet.getCell('E1').alignment = { horizontal: 'right' };
    applyBorder(worksheet.getCell('A1')); applyBorder(worksheet.getCell('E1'));

    worksheet.mergeCells('A2:G2');
    worksheet.getCell('A2').value = `FACULTY NAME: ${faculty?.name?.toUpperCase() || 'FACULTY OF ENGINEERING & TECHNOLOGY'}`;
    worksheet.getCell('A2').font = { bold: true };
    applyBorder(worksheet.getCell('A2'));

    worksheet.mergeCells('A3:G3');
    worksheet.getCell('A3').value = `INSTITUTE NAME: ${institute?.name?.toUpperCase() || 'PARUL INSTITUTE OF TECHNOLOGY'}`;
    worksheet.getCell('A3').font = { bold: true };
    applyBorder(worksheet.getCell('A3'));

    worksheet.mergeCells('A4:D4');
    worksheet.getCell('A4').value = `ACADEMIC YEAR: ${academicYear}`;
    worksheet.getCell('A4').font = { bold: true };
    worksheet.mergeCells('E4:G4');
    worksheet.getCell('E4').value = `YEAR: ${yearStr}`;
    worksheet.getCell('E4').font = { bold: true };
    applyBorder(worksheet.getCell('A4')); applyBorder(worksheet.getCell('E4'));

    worksheet.mergeCells('A5:D5');
    worksheet.getCell('A5').value = `SEMESTER: ${semesterId}${semOrd}`;
    worksheet.getCell('A5').font = { bold: true };
    worksheet.mergeCells('E5:G5');
    worksheet.getCell('E5').value = `LEVEL: UG`;
    worksheet.getCell('E5').font = { bold: true };
    applyBorder(worksheet.getCell('A5')); applyBorder(worksheet.getCell('E5'));

    worksheet.mergeCells('A6:D6');
    worksheet.getCell('A6').value = `PROGRAM NAME: B.TECH ${progName}`;
    worksheet.getCell('A6').font = { bold: true };
    worksheet.mergeCells('E6:G6');
    worksheet.getCell('E6').value = `DIVISION: ${division}`;
    worksheet.getCell('E6').font = { bold: true };
    applyBorder(worksheet.getCell('A6')); applyBorder(worksheet.getCell('E6'));

    try {
      const response = await fetch('/logo.png');
      if (response.ok) {
        const imageBuffer = await response.arrayBuffer();
        const imageId = workbook.addImage({
          buffer: imageBuffer,
          extension: 'png',
        });
        worksheet.mergeCells('H1:I6');
        const logoCell = worksheet.getCell('H1');
        applyBorder(logoCell);

        worksheet.addImage(imageId, 'H1:I6');
      }
    } catch (e) {
      console.log('No logo found at /logo.png');
    }

    worksheet.columns = [
      { width: 15 },
      { width: 22 },
      { width: 22 },
      { width: 22 },
      { width: 22 },
      { width: 22 },
      { width: 22 },
      { width: 3 },
      { width: 10 }
    ];

    const headers = ['TIME', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      applyBorder(cell);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    });

    currentShift.slots.forEach(slot => {
      if (slot.type === 'break') {
        const row = worksheet.addRow([slot.time, `${slot.breakType?.toUpperCase()} BREAK`]);
        row.height = 20;

        row.getCell(1).font = { bold: true };
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        applyBorder(row.getCell(1));

        worksheet.mergeCells(`A${row.number}:A${row.number}`);
        worksheet.mergeCells(`B${row.number}:G${row.number}`);

        const mergedCell = row.getCell(2);
        mergedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        mergedCell.font = { bold: true };
        mergedCell.alignment = { horizontal: 'center', vertical: 'middle' };

        for (let c = 2; c <= 7; c++) {
          applyBorder(row.getCell(c));
        }
      } else {
        const insertData = [slot.time];
        days.forEach(day => {
          const assignment = assignments.find(
            a => a.timeSlot === slot.time && a.day === day
          );

          if (assignment) {
            const subjectLabel = assignment.subject.subjectShortName || assignment.subject.subjectCode;
            insertData.push(`${subjectLabel}\n(${assignment.faculty.shortName})\n${assignment.room.roomNumber}`);
          } else {
            insertData.push('');
          }
        });

        const row = worksheet.addRow(insertData);
        row.height = 55;
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          if (colNumber === 1) {
            cell.font = { bold: true };
          }
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          applyBorder(cell);
        });
      }
    });

    // Add empty borders to fix layout bounds for cells beside the logo
    for (let r = 1; r <= 6; r++) {
      for (let c = 1; c <= 7; c++) {
        applyBorder(worksheet.getCell(r, c));
      }
    }

    // Add empty gap rows
    worksheet.addRow([]);
    worksheet.addRow([]);

    // List of subjects and faculties
    const listHeader = worksheet.addRow([
      'SUBJECT_CODE', 'SUBJECT_NAME', 'SHORT_NAME', 'FACULTY FULL_NAME', 'FACULTY SHORT NAME', 'EMAIL ID', 'MIS ID'
    ]);
    listHeader.font = { bold: true };
    for (let c = 1; c <= 7; c++) {
      const cell = listHeader.getCell(c);
      applyBorder(cell);
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    const uniqueSubjectFaculties = Array.from(
      new Map(
        assignments.map(a => [
          `${a.subject.id || a.subject.subjectId}-${a.faculty.id || a.faculty.facultyId}`,
          { subject: a.subject, faculty: a.faculty }
        ])
      ).values()
    );

    if (uniqueSubjectFaculties.length === 0) {
      const emptyRow = worksheet.addRow(['', '', '', '', '', '', '']);
      for (let c = 1; c <= 7; c++) {
        applyBorder(emptyRow.getCell(c));
      }
    }

    uniqueSubjectFaculties.forEach((item) => {
      const dbFaculty = allFaculties.find(f => f.id === item.faculty.id || f.facultyId === item.faculty.facultyId) || {};
      const subject = item.subject;
      const row = worksheet.addRow([
         subject.subjectCode || '',
         subject.subjectName || '',
         subject.subjectShortName || '',
         item.faculty.name || '',
         item.faculty.shortName || '',
         dbFaculty.email || '',
         dbFaculty.misId || ''
      ]);
      for (let c = 1; c <= 7; c++) {
        const cell = row.getCell(c);
        applyBorder(cell);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    // Classroom, Lab, and MFT info
    const lectureRooms = Array.from(new Set(assignments.filter(a => !a.subject.isLaboratory).map(a => a.room.roomNumber))).join(', ');
    const labRooms = Array.from(new Set(assignments.filter(a => a.subject.isLaboratory).map(a => a.room.roomNumber))).join(', ');

    const classRoomRow = worksheet.addRow([
       'CLASSROOM NO:', '', lectureRooms, '', '', 'FACULTY REPRESENTATIVE / MFT', mft?.name || ''
    ]);
    classRoomRow.height = 30;
    worksheet.mergeCells(`A${classRoomRow.number}:B${classRoomRow.number}`);
    worksheet.mergeCells(`C${classRoomRow.number}:E${classRoomRow.number}`);

    classRoomRow.getCell(1).font = { bold: true };
    classRoomRow.getCell(6).font = { bold: true };
    classRoomRow.getCell(6).alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
    classRoomRow.getCell(7).alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
    for (let c = 1; c <= 7; c++) applyBorder(classRoomRow.getCell(c));

    const labRoomRow = worksheet.addRow([
       'LAB/ TUTORIAL LOCATION:', '', labRooms, '', '', '', ''
    ]);
    labRoomRow.height = 30;
    worksheet.mergeCells(`A${labRoomRow.number}:B${labRoomRow.number}`);
    worksheet.mergeCells(`C${labRoomRow.number}:E${labRoomRow.number}`);
    worksheet.mergeCells(`F${classRoomRow.number}:F${labRoomRow.number}`);
    worksheet.mergeCells(`G${classRoomRow.number}:G${labRoomRow.number}`);

    labRoomRow.getCell(1).font = { bold: true };
    for (let c = 1; c <= 7; c++) applyBorder(labRoomRow.getCell(c));

    const signatureRow = worksheet.addRow([
       'Mr. Utpalkumar Bhupendrabhai Patel\nMr. Meetkumar Manojkumar Patel\n\nTime Table Coordinator', '', '',
       'Ms Sumitra Menaria\n\nHead of Department\nComputer Science and Engineering', '',
       'Dr. Ruchi Pankaj Shrivastava\n\nPrincipal\nParul Institute of Technology.', ''
    ]);
    signatureRow.height = 100;
    worksheet.mergeCells(`A${signatureRow.number}:C${signatureRow.number}`);
    worksheet.mergeCells(`D${signatureRow.number}:E${signatureRow.number}`);
    worksheet.mergeCells(`F${signatureRow.number}:G${signatureRow.number}`);

    for (let c = 1; c <= 7; c++) {
      const cell = signatureRow.getCell(c);
      applyBorder(cell);
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Timetable_${departmentId}_Sem${semesterId}_Div${division}.xlsx`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Timetable Grid</h3>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <span>Academic Year:</span>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="ml-2 border-none bg-transparent font-medium focus:ring-0 cursor-pointer p-0 text-sm text-blue-600"
              >
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2027-2028">2027-2028</option>
                <option value="2028-2029">2028-2029</option>
              </select>
            </div>
            
            {/* MFT Assignment Module */}
            <div className="flex items-center text-sm text-gray-500 mt-2 relative">
              <span className="mr-2">MFT (Class Teacher):</span>
              {mft ? (
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md border border-blue-200">
                  <span className="font-medium truncate max-w-[150px]" title={mft.name}>{mft.name} ({mft.shortName})</span>
                  <button onClick={() => setMft(null)} className="text-blue-500 hover:text-blue-700 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsMftDropdownOpen(!isMftDropdownOpen)}
                    className="text-xs py-1 h-auto"
                  >
                    Assign MFT
                  </Button>
                  
                  {isMftDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsMftDropdownOpen(false)}
                      ></div>
                      <div className="absolute top-full mt-1 left-0 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                        <div className="p-2 border-b border-gray-100 flex items-center">
                          <Search size={14} className="text-gray-400 mr-2" />
                          <input 
                            type="text" 
                            placeholder="Search faculty..." 
                            className="text-sm outline-none w-full bg-transparent"
                            value={mftSearch}
                            onChange={(e) => setMftSearch(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {allFaculties
                            .filter(f => f.name?.toLowerCase().includes(mftSearch.toLowerCase()) || f.shortName?.toLowerCase().includes(mftSearch.toLowerCase()))
                            .map(f => {
                              const facultyIdentifier = f.facultyId || f.id;
                              const conflict = allMfts[facultyIdentifier];
                              return (
                                <div 
                                  key={f.id} 
                                  className={`px-3 py-2 text-sm flex justify-between items-center ${conflict ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-blue-50 cursor-pointer'}`}
                                  onClick={() => {
                                    if (!conflict) {
                                      setMft({
                                        id: String(f.id || ''),
                                        name: String(f.name || ''),
                                        shortName: String(f.shortName || ''),
                                        facultyId: String(f.facultyId || ''),
                                      });
                                      setIsMftDropdownOpen(false);
                                      setMftSearch('');
                                    }
                                  }}
                                >
                                  <div className="min-w-0 pr-2">
                                    <div className="font-medium truncate" title={f.name}>{f.name}</div>
                                    <div className="text-xs text-gray-500">{f.shortName}</div>
                                  </div>
                                  {conflict && (
                                    <div className="flex items-center text-xs text-red-500 whitespace-nowrap bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                      <Lock size={10} className="mr-1" />
                                      <span>Div {conflict.division}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          {allFaculties.length === 0 && (
                            <div className="p-3 text-center text-xs text-gray-500">Loading faculties...</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleReset}
            disabled={isResetting || assignments.length === 0}
          >
            {isResetting ? 'Resetting...' : 'Reset Timetable'}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedShift === 'morning' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedShift('morning')}
          >
            Morning Shift
          </Button>
          <Button
            variant={selectedShift === 'general' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedShift('general')}
          >
            General Shift
          </Button>
        </div>
      </div>
      <div className="overflow-x-hidden overflow-y-auto max-h-[40rem]">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[120px]">
                Time
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0 min-w-[120px]"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {currentShift.slots.map((slot, index) => (
              <tr key={index} className="border-b border-gray-200 last:border-b-0">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200 min-w-[120px]">
                  {slot.time}
                </td>
                {slot.type === 'break' ? (
                  <td
                    colSpan={days.length}
                    className="px-4 py-3 text-sm text-center text-gray-700 bg-yellow-50 border-r border-gray-200 last:border-r-0"
                  >
                    {slot.breakType} Break
                  </td>
                ) : (
                  days.map((day) => {
                    const assignment = assignments.find(
                      a => a.timeSlot === slot.time && a.day === day
                    );

                    // Check if we should skip rendering because previous slot was same lab
                    const prevSlotIndex = index - 1;
                    const prevSlot = prevSlotIndex >= 0 ? currentShift.slots[prevSlotIndex] : null;

                    let skipRender = false;
                    if (prevSlot && prevSlot.type === 'teaching') {
                       const prevAssignment = assignments.find(
                         a => a.timeSlot === prevSlot.time && a.day === day
                       );
                       // We skip if this slot has the SAME lab assignment as the previous slot
                       if (assignment && prevAssignment && isLabSubject(prevAssignment.subject) && 
                           prevAssignment.subject.id === assignment.subject.id && 
                           prevAssignment.faculty.id === assignment.faculty.id) {
                          skipRender = true;
                       }
                    }

                    if (skipRender) return null;

                    let rowSpan = 1;
                    if (assignment && isLabSubject(assignment.subject)) {
                       const nextSlotIndex = index + 1;
                       const nextSlot = nextSlotIndex < currentShift.slots.length ? currentShift.slots[nextSlotIndex] : null;
                       if (nextSlot && nextSlot.type === 'teaching') {
                          const nextAssignment = assignments.find(
                             a => a.timeSlot === nextSlot.time && a.day === day
                          );
                          if (nextAssignment && nextAssignment.subject.id === assignment.subject.id && 
                              nextAssignment.faculty.id === assignment.faculty.id) {
                             rowSpan = 2;
                          }
                       }
                    }

                    return (
                      <td
                        key={day}
                        rowSpan={rowSpan}
                        className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 border-b last:border-r-0 hover:bg-gray-50 cursor-pointer transition-colors min-w-[120px] relative group"
                        onClick={() => handleCellClick(slot.time, day)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'copy';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          try {
                            const dataStr = e.dataTransfer.getData('application/json');
                            if (dataStr) {
                              const data = JSON.parse(dataStr);
                              if (data && data.subject && data.faculty && data.room) {
                                assignLectureToSlot(data.subject, data.faculty, data.room, { timeSlot: slot.time, day });
                              }
                            }
                          } catch (err) {
                            console.error("Failed to drop lecture", err);
                          }
                        }}
                      >
                        {assignment ? (
                          <div className={`text-center flex flex-col justify-center items-center relative ${rowSpan === 2 ? 'min-h-[6rem]' : 'min-h-[3rem]'}`}>
                            <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 if (isLabSubject(assignment.subject)) {
                                   setAssignments(prev => prev.filter(a => !(a.day === day && a.subject.id === assignment.subject.id && a.faculty.id === assignment.faculty.id && a.room.id === assignment.room.id)));
                                 } else {
                                   setAssignments(prev => prev.filter(a => !(a.timeSlot === slot.time && a.day === day)));
                                 }
                               }}
                               className="absolute -top-1 -right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity bg-white rounded-full p-0.5 shadow-sm border border-gray-100 z-10"
                               title="Unassign"
                            >
                               <X size={14} />
                            </button>
                            <div className="font-medium text-blue-600">
                              {assignment.subject.subjectShortName || assignment.subject.subjectCode}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              ({assignment.faculty.shortName}) {assignment.room.roomNumber}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 text-xs">
                            Click to assign
                          </div>
                        )}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {assignments.length > 0 && (
            <span>{assignments.length} assignment{assignments.length !== 1 ? 's' : ''} created</span>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="text-green-700 hover:text-green-800 border-green-200 hover:bg-green-50"
          >
            Export to Excel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleReset}
            disabled={isResetting || assignments.length === 0}
          >
            {isResetting ? 'Resetting...' : 'Reset Timetable'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
          >
            {isSaving ? 'Saving...' : 'Save Timetable'}
          </Button>
        </div>
      </div>
      
      {/* Draggable Lectures Pool */}
      {(() => {
        const uniqueLectures = Array.from(
          new Map(
            assignments.map(a => [
              `${a.subject.id || a.subject.subjectId}-${a.faculty.id || a.faculty.facultyId}-${a.room.id || a.room.roomId}`,
              { subject: a.subject, faculty: a.faculty, room: a.room }
            ])
          ).values()
        );
        
        if (uniqueLectures.length === 0) return null;
        
        return (
          <div className="px-6 py-4 border-t border-gray-200 bg-white">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Assigned Lectures (Drag & Drop to reassign quickly)</h4>
            <div className="flex flex-wrap gap-3">
              {uniqueLectures.map((lecture, idx) => (
                <div 
                  key={idx}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify(lecture));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="bg-blue-50 border border-blue-200 rounded p-3 text-sm cursor-grab active:cursor-grabbing hover:bg-blue-100 transition-colors shadow-sm flex flex-col items-center min-w-[120px]"
                >
                  <div className="font-semibold text-blue-800">{lecture.subject.subjectShortName || lecture.subject.subjectCode}</div>
                  <div className="text-xs text-blue-600 mt-1 font-medium">{lecture.faculty.shortName}</div>
                  <div className="text-xs text-blue-500">{lecture.room.roomNumber}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <TimetableCellModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSelect={handleCellSelect}
        timeSlot={selectedCell?.timeSlot || ''}
        day={selectedCell?.day || ''}
        semesterId={semesterId}
        departmentId={departmentId}
        division={division}
        slots={currentShift.slots}
      />
    </div>
  );
};

export default TimetableGrid;
