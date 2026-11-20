import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'campus_portal.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      head_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('STUDENT', 'FACULTY', 'ADMIN', 'MAINTENANCE')),
      university_id TEXT NOT NULL UNIQUE,
      department TEXT NOT NULL,
      semester TEXT,
      section TEXT,
      specialty TEXT,
      is_approved INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id TEXT NOT NULL UNIQUE,
      student_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT NOT NULL DEFAULT '',
      department TEXT NOT NULL,
      semester TEXT,
      section TEXT,
      location TEXT NOT NULL,
      faculty_id INTEGER REFERENCES users(id),
      tagged_faculty_ids TEXT NOT NULL DEFAULT '[]',
      assigned_to INTEGER REFERENCES users(id),
      priority TEXT NOT NULL DEFAULT 'Medium' CHECK(priority IN ('Low', 'Medium', 'High', 'Critical')),
      status TEXT NOT NULL DEFAULT 'SUBMITTED',
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      deadline_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_complaints_student ON complaints(student_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_faculty ON complaints(faculty_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_assigned ON complaints(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);

    CREATE TABLE IF NOT EXISTS complaint_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      uploaded_by INTEGER NOT NULL REFERENCES users(id),
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      attachment_kind TEXT NOT NULL DEFAULT 'EVIDENCE',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS complaint_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      attachment_url TEXT,
      attachment_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS complaint_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      old_status TEXT,
      new_status TEXT NOT NULL,
      updated_by INTEGER NOT NULL REFERENCES users(id),
      remarks TEXT NOT NULL DEFAULT '',
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

    CREATE TABLE IF NOT EXISTS management_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      admin_id INTEGER NOT NULL REFERENCES users(id),
      note TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resolution_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL UNIQUE REFERENCES complaints(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id),
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      feedback TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedIfEmpty();
}

function seedIfEmpty() {
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount > 0) return;

  const depts = [
    ['Computer Science & Engineering', 'CSE', 'Dr. Ananya Rao'],
    ['Electronics & Communication', 'ECE', 'Prof. Vikram Mehta'],
    ['Mechanical Engineering', 'ME', 'Dr. Kavita Nair'],
    ['Civil Engineering', 'CE', 'Prof. Arvind Iyer'],
    ['Central Administration', 'ADMIN', 'Dr. Raghavendra Menon'],
    ['Campus Facilities & Maintenance', 'MAINT', 'Er. Prakash Kulkarni'],
  ];

  const insertDept = db.prepare('INSERT INTO departments (name, code, head_name) VALUES (?, ?, ?)');
  for (const d of depts) {
    insertDept.run(...d);
  }

  const demoPasswordHash = bcrypt.hashSync('Password@123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (full_name, email, password_hash, role, university_id, department, semester, section, specialty, is_approved)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const student1 = insertUser.run(
    'Aarav Sharma',
    'aarav.sharma@university.edu',
    demoPasswordHash,
    'STUDENT',
    'ENG25CS0104',
    'Computer Science & Engineering',
    '5th Semester',
    'Section A',
    null,
    1
  ).lastInsertRowid as number;

  const student2 = insertUser.run(
    'Mahi Talwani',
    'mahi.talwani@university.edu',
    demoPasswordHash,
    'STUDENT',
    'ENG25CS0587',
    'Computer Science & Engineering',
    '5th Semester',
    'Section B',
    null,
    1
  ).lastInsertRowid as number;

  const faculty1 = insertUser.run(
    'Dr. Ananya Rao',
    'dr.ananya.rao@university.edu',
    demoPasswordHash,
    'FACULTY',
    'FAC2021004',
    'Computer Science & Engineering',
    null,
    null,
    'Distributed Systems & Academic Advising',
    1
  ).lastInsertRowid as number;

  const faculty2 = insertUser.run(
    'Prof. Vikram Mehta',
    'prof.vikram.mehta@university.edu',
    demoPasswordHash,
    'FACULTY',
    'FAC2019018',
    'Electronics & Communication',
    null,
    null,
    'Embedded Lab & Examination Coordinator',
    1
  ).lastInsertRowid as number;

  const faculty3 = insertUser.run(
    'Dr. Kavita Nair',
    'dr.kavita.nair@university.edu',
    demoPasswordHash,
    'FACULTY',
    'FAC2020011',
    'Mechanical Engineering',
    null,
    null,
    'Thermal Labs & Hostel Warden',
    1
  ).lastInsertRowid as number;

  const admin1 = insertUser.run(
    'Dr. Raghavendra Menon',
    'dean.management@university.edu',
    demoPasswordHash,
    'ADMIN',
    'ADM2018001',
    'Central Administration',
    null,
    null,
    'Dean of Student Affairs & Grievances',
    1
  ).lastInsertRowid as number;

  const maint1 = insertUser.run(
    'Rakesh Verma',
    'rakesh.electrical@university.edu',
    demoPasswordHash,
    'MAINTENANCE',
    'MNT2022007',
    'Campus Facilities & Maintenance',
    null,
    null,
    'Electrical & Classroom Maintenance',
    1
  ).lastInsertRowid as number;

  const maint2 = insertUser.run(
    'Suresh Gowda',
    'suresh.plumbing@university.edu',
    demoPasswordHash,
    'MAINTENANCE',
    'MNT2022012',
    'Campus Facilities & Maintenance',
    null,
    null,
    'Plumbing & Water Supply',
    1
  ).lastInsertRowid as number;

  const insertComplaint = db.prepare(`
    INSERT INTO complaints (
      complaint_id, student_id, title, description, category, subcategory,
      department, semester, section, location, faculty_id, tagged_faculty_ids,
      assigned_to, priority, status, is_anonymous, deadline_at, created_at, updated_at, resolved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const c1 = insertComplaint.run(
    'CMP20261114001',
    student1,
    'Projector flickering and HDMI port failure in Lecture Hall C-204',
    'During morning Operating Systems lectures, the ceiling projector shuts off intermittently every 10 minutes and the podium HDMI socket has loose wiring, interrupting code demonstrations.',
    'Classroom Maintenance',
    'Audio-Visual Equipment',
    'Computer Science & Engineering',
    '5th Semester',
    'Section A',
    'Academic Block C · Room C-204',
    faculty1,
    JSON.stringify([faculty1]),
    maint1,
    'High',
    'IN_PROGRESS',
    0,
    '2026-11-21 17:00:00',
    '2026-11-14 09:30:00',
    '2026-11-18 14:20:00',
    null
  ).lastInsertRowid as number;

  const c2 = insertComplaint.run(
    'CMP20261115002',
    student2,
    'Internal assessment marks discrepancy in Embedded Systems Lab',
    'Three students from Section B submitted Lab Record #4 before the portal cutoff, yet the provisional score sheet shows zero for experiment evaluation. Requesting verification with the lab coordinator.',
    'Examination',
    'Internal Marks Review',
    'Electronics & Communication',
    '5th Semester',
    'Section B',
    'ECE Block · Lab 3B',
    faculty2,
    JSON.stringify([faculty2]),
    faculty2,
    'High',
    'ACTION_TAKEN',
    0,
    '2026-11-22 17:00:00',
    '2026-11-15 11:15:00',
    '2026-11-19 10:05:00',
    null
  ).lastInsertRowid as number;

  const c3 = insertComplaint.run(
    'CMP20261116003',
    student1,
    'RO drinking water cooler leaking on 2nd floor North Wing',
    'The water dispenser outside the North Wing corridor has a cracked drain pipe causing slippery tiles and low water pressure since Tuesday afternoon.',
    'Drinking Water',
    'Water Supply & Purifier',
    'Campus Facilities & Maintenance',
    '5th Semester',
    'Section A',
    'Engineering Block A · 2nd Floor North Wing',
    null,
    JSON.stringify([]),
    maint2,
    'Critical',
    'ASSIGNED',
    0,
    '2026-11-19 18:00:00',
    '2026-11-16 08:40:00',
    '2026-11-17 16:00:00',
    null
  ).lastInsertRowid as number;

  const c4 = insertComplaint.run(
    'CMP20261110004',
    student2,
    'Library quiet zone Wi-Fi drops during evening research hours',
    'Access Point AP-LIB-04 in the Central Library 2nd floor reading hall disconnects devices every 15 minutes between 5:30 PM and 8:30 PM.',
    'Internet and Wi-Fi',
    'Campus Wi-Fi Access Point',
    'Computer Science & Engineering',
    '5th Semester',
    'Section B',
    'Central Library · 2nd Floor Quiet Zone',
    faculty1,
    JSON.stringify([faculty1]),
    maint1,
    'Medium',
    'RESOLVED',
    0,
    '2026-11-16 17:00:00',
    '2026-11-10 18:20:00',
    '2026-11-15 15:45:00',
    '2026-11-15 15:45:00'
  ).lastInsertRowid as number;

  const c5 = insertComplaint.run(
    'CMP20261118005',
    student1,
    'Inconsistent lab grading rubric & late syllabus updates',
    'Course grading weights were altered mid-semester without an updated handout on the LMS, making it unclear how mini-project milestones contribute to final internals.',
    'Academics',
    'Grading & Syllabus Transparency',
    'Mechanical Engineering',
    '5th Semester',
    'Section A',
    'Mechanical Block · Seminar Hall 1',
    faculty3,
    JSON.stringify([faculty3]),
    null,
    'Medium',
    'UNDER_REVIEW',
    1,
    '2026-11-25 17:00:00',
    '2026-11-18 13:10:00',
    '2026-11-18 16:45:00',
    null
  ).lastInsertRowid as number;

  const c6 = insertComplaint.run(
    'CMP20261119006',
    student2,
    'Shuttle bus Route 4 overcrowding during 8:15 AM peak departure',
    'Route 4 bus from South Gate frequently exceeds seating capacity by 20+ students before the second stop. Adding a morning relief shuttle would prevent missed first-hour labs.',
    'Transportation',
    'Campus Shuttle Capacity',
    'Central Administration',
    '5th Semester',
    'Section B',
    'South Gate Shuttle Bay',
    null,
    JSON.stringify([]),
    null,
    'Low',
    'SUBMITTED',
    0,
    '2026-11-27 17:00:00',
    '2026-11-19 08:55:00',
    '2026-11-19 08:55:00',
    null
  ).lastInsertRowid as number;

  const insertHistory = db.prepare(`
    INSERT INTO complaint_history (complaint_id, old_status, new_status, updated_by, remarks, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertHistory.run(c1, null, 'SUBMITTED', student1, 'Complaint registered with Dr. Ananya Rao tagged.', '2026-11-14 09:30:00');
  insertHistory.run(c1, 'SUBMITTED', 'UNDER_REVIEW', admin1, 'Reviewed by Central Grievance Cell; verified room schedule.', '2026-11-14 14:10:00');
  insertHistory.run(c1, 'UNDER_REVIEW', 'ASSIGNED', admin1, 'Assigned to Electrical & Classroom Maintenance (Rakesh Verma).', '2026-11-15 09:00:00');
  insertHistory.run(c1, 'ASSIGNED', 'IN_PROGRESS', maint1, 'Replacement HDMI wall plate ordered; testing projector lamp ballast.', '2026-11-18 14:20:00');

  insertHistory.run(c2, null, 'SUBMITTED', student2, 'Complaint submitted regarding Lab Record #4 evaluation.', '2026-11-15 11:15:00');
  insertHistory.run(c2, 'SUBMITTED', 'ASSIGNED', admin1, 'Assigned to Prof. Vikram Mehta for lab log audit.', '2026-11-16 10:00:00');
  insertHistory.run(c2, 'ASSIGNED', 'ACTION_TAKEN', faculty2, 'Verified Moodle timestamps; revised marksheet submitted to Exam Cell for verification.', '2026-11-19 10:05:00');

  insertHistory.run(c3, null, 'SUBMITTED', student1, 'Reported leaking RO water purifier on North Wing 2nd Floor.', '2026-11-16 08:40:00');
  insertHistory.run(c3, 'SUBMITTED', 'ASSIGNED', admin1, 'Marked Critical due to slip hazard; assigned to Plumbing team.', '2026-11-17 16:00:00');

  insertHistory.run(c4, null, 'SUBMITTED', student2, 'Reported evening Wi-Fi drops in Library Quiet Zone.', '2026-11-10 18:20:00');
  insertHistory.run(c4, 'SUBMITTED', 'ASSIGNED', admin1, 'Assigned to campus IT & electrical maintenance.', '2026-11-11 09:45:00');
  insertHistory.run(c4, 'ASSIGNED', 'ACTION_TAKEN', maint1, 'Replaced faulty PoE injector and updated AP-LIB-04 firmware.', '2026-11-14 17:10:00');
  insertHistory.run(c4, 'ACTION_TAKEN', 'RESOLVED', admin1, 'Verified stable throughput for 24 hours. Marked resolved.', '2026-11-15 15:45:00');

  insertHistory.run(c5, null, 'SUBMITTED', student1, 'Anonymous academic complaint submitted.', '2026-11-18 13:10:00');
  insertHistory.run(c5, 'SUBMITTED', 'UNDER_REVIEW', admin1, 'Academic Review Committee examining syllabus versioning.', '2026-11-18 16:45:00');

  insertHistory.run(c6, null, 'SUBMITTED', student2, 'Submitted shuttle capacity feedback for Route 4.', '2026-11-19 08:55:00');

  const insertComment = db.prepare(`
    INSERT INTO complaint_comments (complaint_id, user_id, message, created_at)
    VALUES (?, ?, ?, ?)
  `);
  insertComment.run(c1, faculty1, 'Confirmed this issue during yesterday morning lecture. Temporary VGA adapter is in the podium drawer until HDMI replacement finishes.', '2026-11-15 10:15:00');
  insertComment.run(c1, maint1, 'Inspected the ceiling mount. New shielded HDMI cable and wall faceplate are being installed tomorrow morning.', '2026-11-18 14:25:00');
  insertComment.run(c2, faculty2, 'I have cross-checked the LMS submission timestamps for Section B and uploaded the corrected score sheet for management verification.', '2026-11-19 10:10:00');

  const insertNote = db.prepare(`
    INSERT INTO management_notes (complaint_id, admin_id, note, created_at)
    VALUES (?, ?, ?, ?)
  `);
  insertNote.run(c5, admin1, 'Protected anonymous submission. Requesting updated course plan PDF from ME Department before notifying faculty.', '2026-11-18 16:50:00');

  const insertFeedback = db.prepare(`
    INSERT INTO resolution_feedback (complaint_id, student_id, rating, feedback, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertFeedback.run(c4, student2, 5, 'Wi-Fi stability in the reading hall has been rock solid since the PoE replacement. Thank you for the quick turnaround.', '2026-11-16 11:00:00');

  const insertNotif = db.prepare(`
    INSERT INTO notifications (user_id, title, message, complaint_id, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertNotif.run(faculty1, 'Tagged in Complaint CMP20261114001', 'You were tagged in "Projector flickering and HDMI port failure in Lecture Hall C-204".', c1, 0, '2026-11-14 09:31:00');
  insertNotif.run(faculty2, 'Complaint Assigned: CMP20261115002', 'Management assigned "Internal assessment marks discrepancy in Embedded Systems Lab" for review.', c2, 0, '2026-11-16 10:01:00');
  insertNotif.run(faculty3, 'Anonymous Academic Complaint Tagged', 'An anonymous student tagged you in CMP20261118005 regarding syllabus clarity.', c5, 0, '2026-11-18 13:11:00');
  insertNotif.run(student1, 'Maintenance Update on CMP20261114001', 'Rakesh Verma updated status to In Progress: Replacement HDMI wall plate ordered.', c1, 0, '2026-11-18 14:21:00');
  insertNotif.run(student2, 'Action Taken on CMP20261115002', 'Prof. Vikram Mehta submitted an explanation and revised score sheet.', c2, 0, '2026-11-19 10:06:00');
  insertNotif.run(admin1, 'Critical Complaint Overdue Alert', 'CMP20261116003 (RO drinking water cooler leaking) has passed its target resolution deadline.', c3, 0, '2026-11-19 18:05:00');
  insertNotif.run(maint1, 'Task In Progress: CMP20261114001', 'Reminder to upload before-and-after verification photos once HDMI repair completes.', c1, 0, '2026-11-18 14:22:00');
  insertNotif.run(maint2, 'New Critical Task: CMP20261116003', 'Assigned RO drinking water cooler leak in Engineering Block A · 2nd Floor North Wing.', c3, 0, '2026-11-17 16:01:00');
}
