export const summaryStats = [
  {
    title: 'Total Classes',
    count: 45,
    icon: 'BookOpen',
  },
  {
    title: 'Total Faculty',
    count: 28,
    icon: 'Users',
  },
  {
    title: 'Total Rooms',
    count: 12,
    icon: 'MapPin',
  },
  {
    title: 'Active Timetables',
    count: 8,
    icon: 'Calendar',
  },
];

export const timetableData = [
  {
    timeSlot: '9:00 AM - 10:00 AM',
    subject: 'Mathematics',
    class: 'BCA 1st Year',
    faculty: 'Dr. John Doe',
    room: 'Room 101',
    status: 'Scheduled',
  },
  {
    timeSlot: '10:00 AM - 11:00 AM',
    subject: 'Computer Science',
    class: 'BCA 2nd Year',
    faculty: 'Prof. Jane Smith',
    room: 'Room 102',
    status: 'Completed',
  },
  {
    timeSlot: '11:00 AM - 12:00 PM',
    subject: 'Physics',
    class: 'BCA 1st Year',
    faculty: 'Dr. Alice Johnson',
    room: 'Room 103',
    status: 'Scheduled',
  },
  {
    timeSlot: '1:00 PM - 2:00 PM',
    subject: 'Chemistry',
    class: 'BCA 3rd Year',
    faculty: 'Prof. Bob Wilson',
    room: 'Room 104',
    status: 'Cancelled',
  },
  {
    timeSlot: '2:00 PM - 3:00 PM',
    subject: 'English',
    class: 'BCA 2nd Year',
    faculty: 'Ms. Emily Davis',
    room: 'Room 105',
    status: 'Scheduled',
  },
];

export const institutes = [
  {
    id: '1',
    name: 'Parul Institute of Technology',
  },
  {
    id: '2',
    name: 'Parul Institute of Science',
  },
  {
    id: '3',
    name: 'Parul Institute of Arts',
  },
];

export const faculties = [
  {
    id: '1',
    name: 'Faculty of Engineering and Technology',
    instituteId: '1',
  },
  {
    id: '2',
    name: 'Faculty of Applied Science',
    instituteId: '1',
  },
  {
    id: '3',
    name: 'Faculty of Pure Science',
    instituteId: '2',
  },
  {
    id: '4',
    name: 'Faculty of Social Sciences',
    instituteId: '3',
  },
];

export const departments = [
  {
    id: 'cs',
    name: 'Computer Science',
    code: 'CS',
    letter: 'A',
    facultyId: '1',
    divisions: ['1', '2', '3', '4', '5', '6'],
  },
  {
    id: 'ai',
    name: 'Artifical Intelligence',
    code: 'AI',
    letter: 'B',
    facultyId: '1',
    divisions: ['1', '2', '3', '4', '5', '6'],
  },
  {
    id: 'cs',
    name: 'Cyber Security',
    code: 'CS',
    letter: 'C',
    facultyId: '1',
    divisions: ['1', '2', '3', '4', '5', '6'],
  },
  {
    id: 'physics',
    name: 'Physics',
    code: 'PH',
    letter: 'P',
    facultyId: '2',
    divisions: ['1', '2', '3', '4', '5', '6'],
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    code: 'CH',
    letter: 'H',
    facultyId: '2',
    divisions: ['1', '2', '3', '4', '5', '6'],
  },
];
