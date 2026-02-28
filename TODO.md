# Lab Master Grid Implementation

## Tasks
- [x] Create components/LabMasterGrid.tsx with sample labs, double slots, days, and grid structure (sticky header/column, scrollable, clickable cells with Free/Occupied states)
- [x] Edit app/reports/lab-master/page.tsx to import and use LabMasterGrid component instead of placeholder
- [x] Update room selection for lab subjects to show all rooms (not just lab rooms)
- [x] Update LabMasterGrid to show real assignment data from timetable instead of manual toggling
- [x] Fix time slot mapping for double slots to correctly detect lab assignments
- [x] Update Lab Master grid to show assignment details in same format as Lecture Master (subject, faculty, division)

# Faculty Master Timetable Implementation

## Tasks
- [x] Create components/FacultyMasterGrid.tsx with faculty-centric grid layout
- [x] Implement proper time slots: 7:30–9:30, 9:45–11:45, 12:45–2:25, 2:45–4:45
- [x] Days: Monday through Friday (no Sunday)
- [x] Cell colors: Red (blocked), Beige (free), Orange (theory), Pink (practical), Green (lab), Yellow (special)
- [x] Cell content format: Class : Subject, Room, Strength (optional)
- [x] Sticky faculty column with light green background
- [x] Centered title "Faculty Master Timetable"
- [x] Update app/reports/faculty-master/page-new.tsx to use FacultyMasterGrid component
