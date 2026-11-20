import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase } from './server/db.ts';
import type { ComplaintStatus, UserRole } from './src/types.ts';

dotenv.config();
initDatabase();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'campus-portal-dev-secret-change-in-production';

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Multer configuration with strict file type & size validation
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeBase = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeBase}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Allowed: JPG, PNG, WEBP, PDF, DOC, DOCX, TXT.'));
    }
  },
});

interface AuthUserPayload {
  id: number;
  email: string;
  role: UserRole;
}

interface AuthedRequest extends Request {
  user?: AuthUserPayload & {
    full_name: string;
    university_id: string;
    department: string;
    semester?: string | null;
    section?: string | null;
    specialty?: string | null;
    is_approved: number;
    created_at: string;
  };
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      cookies[key] = decodeURIComponent(val);
    }
  }
  return cookies;
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies.campus_token || null;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    const dbUser = db
      .prepare(
        'SELECT id, full_name, email, role, university_id, department, semester, section, specialty, is_approved, created_at FROM users WHERE id = ?'
      )
      .get(decoded.id) as AuthedRequest['user'] | undefined;
    if (!dbUser) {
      return res.status(401).json({ error: 'Session user no longer exists.' });
    }
    if (!dbUser.is_approved) {
      return res.status(403).json({ error: 'Your account is pending administration approval.' });
    }
    req.user = dbUser;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied for your account role.' });
    }
    next();
  };
}

function logAudit(userId: number | null, action: string, targetType: string, targetId: string | number | null, details?: string) {
  db.prepare(
    'INSERT INTO audit_logs (user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, action, targetType, targetId ? String(targetId) : null, details || null);
}

function createNotification(userId: number, title: string, message: string, complaintId: number | null = null) {
  db.prepare(
    'INSERT INTO notifications (user_id, title, message, complaint_id) VALUES (?, ?, ?, ?)'
  ).run(userId, title, message, complaintId);
}

function notifyAdmins(title: string, message: string, complaintId: number | null = null) {
  const admins = db.prepare("SELECT id FROM users WHERE role = 'ADMIN'").all() as { id: number }[];
  for (const admin of admins) {
    createNotification(admin.id, title, message, complaintId);
  }
}

function generateComplaintCode(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `CMP${yyyy}${mm}${dd}`;
  const row = db
    .prepare('SELECT COUNT(*) as cnt FROM complaints WHERE complaint_id LIKE ?')
    .get(`${prefix}%`) as { cnt: number };
  const seq = String(row.cnt + 1).padStart(3, '0');
  return `${prefix}${seq}`;
}

function formatComplaintRow(row: any, viewerRole?: UserRole, viewerId?: number) {
  let taggedIds: number[] = [];
  try {
    taggedIds = JSON.parse(row.tagged_faculty_ids || '[]');
  } catch {
    taggedIds = [];
  }
  if (row.faculty_id && !taggedIds.includes(row.faculty_id)) {
    taggedIds.unshift(row.faculty_id);
  }

  let taggedNames: string[] = [];
  if (taggedIds.length > 0) {
    const placeholders = taggedIds.map(() => '?').join(',');
    const facultyRows = db
      .prepare(`SELECT id, full_name FROM users WHERE id IN (${placeholders})`)
      .all(...taggedIds) as { id: number; full_name: string }[];
    taggedNames = facultyRows.map((f) => f.full_name);
  }

  const isMaskNeeded =
    Boolean(row.is_anonymous) && viewerRole !== 'ADMIN' && viewerId !== row.student_id;

  return {
    ...row,
    tagged_faculty_ids: taggedIds,
    tagged_faculty_names: taggedNames,
    student_id: isMaskNeeded ? null : row.student_id,
    student_name: isMaskNeeded ? 'Anonymous Student' : row.student_name,
    student_usn: isMaskNeeded ? 'Protected' : row.student_usn,
    student_email: isMaskNeeded ? undefined : row.student_email,
  };
}

function canAccessComplaint(complaint: any, user: NonNullable<AuthedRequest['user']>): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'STUDENT') return complaint.student_id === user.id;
  if (user.role === 'MAINTENANCE') return complaint.assigned_to === user.id;
  if (user.role === 'FACULTY') {
    let taggedIds: number[] = [];
    try {
      taggedIds = JSON.parse(complaint.tagged_faculty_ids || '[]');
    } catch {
      taggedIds = [];
    }
    return (
      complaint.faculty_id === user.id ||
      complaint.assigned_to === user.id ||
      taggedIds.includes(user.id)
    );
  }
  return false;
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { full_name, university_id, email, department, semester, section, password } = req.body || {};

    if (!full_name || !university_id || !email || !department || !semester || !section || !password) {
      return res.status(400).json({ error: 'All student registration fields are required.' });
    }
    const emailClean = String(email).trim().toLowerCase();
    const usnClean = String(university_id).trim().toUpperCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      return res.status(400).json({ error: 'Please enter a valid university email address.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existing = db
      .prepare('SELECT id FROM users WHERE lower(email) = ? OR upper(university_id) = ?')
      .get(emailClean, usnClean);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email or USN already exists.' });
    }

    const passwordHash = bcrypt.hashSync(String(password), 10);
    const result = db
      .prepare(`
        INSERT INTO users (full_name, email, password_hash, role, university_id, department, semester, section, is_approved)
        VALUES (?, ?, ?, 'STUDENT', ?, ?, ?, ?, 1)
      `)
      .run(
        String(full_name).trim(),
        emailClean,
        passwordHash,
        usnClean,
        String(department).trim(),
        String(semester).trim(),
        String(section).trim()
      );

    const newUserId = result.lastInsertRowid as number;
    const user = db
      .prepare(
        'SELECT id, full_name, email, role, university_id, department, semester, section, specialty, is_approved, created_at FROM users WHERE id = ?'
      )
      .get(newUserId) as any;

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    logAudit(user.id, 'STUDENT_REGISTER', 'USER', user.id, `Registered USN ${usnClean}`);

    res.cookie('campus_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({ user, token });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { identifier, password, expectedRole, rememberMe } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/ID and password are required.' });
    }

    const cleanId = String(identifier).trim();
    const userRow = db
      .prepare('SELECT * FROM users WHERE lower(email) = lower(?) OR upper(university_id) = upper(?)')
      .get(cleanId, cleanId) as any;

    if (!userRow || !bcrypt.compareSync(String(password), userRow.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials. Please check your ID/email and password.' });
    }

    if (expectedRole) {
      const allowedRoles = Array.isArray(expectedRole) ? expectedRole : [expectedRole];
      if (!allowedRoles.includes(userRow.role)) {
        return res.status(403).json({
          error: `This portal is restricted to ${allowedRoles.join(' / ')} accounts. Your account role is ${userRow.role}.`,
        });
      }
    }

    if (!userRow.is_approved) {
      return res.status(403).json({ error: 'Account awaiting administration approval.' });
    }

    const expiresIn = rememberMe ? '30d' : '24h';
    const token = jwt.sign(
      { id: userRow.id, email: userRow.email, role: userRow.role },
      JWT_SECRET,
      { expiresIn }
    );

    const { password_hash: _pw, ...safeUser } = userRow;
    logAudit(userRow.id, 'LOGIN', 'USER', userRow.id, `Role ${userRow.role}`);

    res.cookie('campus_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000,
    });

    return res.json({ user: safeUser, token });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { identifier } = req.body || {};
  if (!identifier) {
    return res.status(400).json({ error: 'Please enter your university email or USN/Employee ID.' });
  }
  const user = db
    .prepare('SELECT id, email FROM users WHERE lower(email) = lower(?) OR upper(university_id) = upper(?)')
    .get(String(identifier).trim(), String(identifier).trim()) as { id: number; email: string } | undefined;
  if (user) {
    logAudit(user.id, 'PASSWORD_RESET_REQUESTED', 'USER', user.id, `Reset requested for ${user.email}`);
  }
  return res.json({
    message: 'If an account matches those details, password recovery instructions have been dispatched via the University IT Helpdesk.',
  });
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('campus_token');
  return res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res: Response) => {
  return res.json({ user: req.user });
});

app.put('/api/auth/profile', requireAuth, (req: AuthedRequest, res: Response) => {
  const { full_name, department, semester, section, specialty } = req.body || {};
  if (!full_name || String(full_name).trim().length < 2) {
    return res.status(400).json({ error: 'Full name is required.' });
  }
  db.prepare(
    'UPDATE users SET full_name = ?, department = ?, semester = ?, section = ?, specialty = ? WHERE id = ?'
  ).run(
    String(full_name).trim(),
    department || req.user!.department,
    semester ?? req.user!.semester ?? null,
    section ?? req.user!.section ?? null,
    specialty ?? req.user!.specialty ?? null,
    req.user!.id
  );
  const updated = db
    .prepare(
      'SELECT id, full_name, email, role, university_id, department, semester, section, specialty, is_approved, created_at FROM users WHERE id = ?'
    )
    .get(req.user!.id);
  logAudit(req.user!.id, 'PROFILE_UPDATE', 'USER', req.user!.id);
  return res.json({ user: updated });
});

// ==========================================
// DIRECTORY & ADMIN USER MANAGEMENT
// ==========================================

app.get('/api/directory/departments', (_req: Request, res: Response) => {
  const departments = db.prepare('SELECT * FROM departments ORDER BY name ASC').all();
  return res.json({ departments });
});

app.post('/api/directory/departments', requireAuth, requireRole('ADMIN'), (req: AuthedRequest, res: Response) => {
  const { name, code, head_name } = req.body || {};
  if (!name || !code || !head_name) {
    return res.status(400).json({ error: 'Department name, code, and head are required.' });
  }
  try {
    const result = db
      .prepare('INSERT INTO departments (name, code, head_name) VALUES (?, ?, ?)')
      .run(String(name).trim(), String(code).trim().toUpperCase(), String(head_name).trim());
    const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(result.lastInsertRowid);
    logAudit(req.user!.id, 'CREATE_DEPARTMENT', 'DEPARTMENT', result.lastInsertRowid as number, String(name));
    return res.status(201).json({ department: dept });
  } catch (err: any) {
    return res.status(409).json({ error: 'Department name or code already exists.' });
  }
});

app.get('/api/directory/faculty', (req: Request, res: Response) => {
  const dept = req.query.department ? String(req.query.department) : '';
  const search = req.query.q ? String(req.query.q).trim().toLowerCase() : '';
  let faculty = db
    .prepare(
      "SELECT id, full_name, email, university_id, department, specialty FROM users WHERE role = 'FACULTY' AND is_approved = 1 ORDER BY full_name ASC"
    )
    .all() as any[];

  if (dept && dept !== 'All') {
    faculty = faculty.filter((f) => f.department === dept);
  }
  if (search) {
    faculty = faculty.filter(
      (f) =>
        f.full_name.toLowerCase().includes(search) ||
        f.department.toLowerCase().includes(search) ||
        (f.specialty && f.specialty.toLowerCase().includes(search))
    );
  }
  return res.json({ faculty });
});

app.get('/api/directory/maintenance', requireAuth, requireRole('ADMIN'), (_req: AuthedRequest, res: Response) => {
  const maintenance = db
    .prepare(
      "SELECT id, full_name, email, university_id, department, specialty FROM users WHERE role = 'MAINTENANCE' AND is_approved = 1 ORDER BY full_name ASC"
    )
    .all();
  return res.json({ maintenance });
});

app.get('/api/directory/users', requireAuth, requireRole('ADMIN'), (req: AuthedRequest, res: Response) => {
  const role = req.query.role ? String(req.query.role) : '';
  const sql = role
    ? 'SELECT id, full_name, email, role, university_id, department, semester, section, specialty, is_approved, created_at FROM users WHERE role = ? ORDER BY created_at DESC'
    : 'SELECT id, full_name, email, role, university_id, department, semester, section, specialty, is_approved, created_at FROM users ORDER BY created_at DESC';
  const users = role ? db.prepare(sql).all(role) : db.prepare(sql).all();
  return res.json({ users });
});

app.post('/api/directory/users', requireAuth, requireRole('ADMIN'), (req: AuthedRequest, res: Response) => {
  const { full_name, email, university_id, role, department, specialty, password } = req.body || {};
  if (!full_name || !email || !university_id || !role || !department) {
    return res.status(400).json({ error: 'All staff account fields are required.' });
  }
  if (!['FACULTY', 'MAINTENANCE', 'ADMIN'].includes(role)) {
    return res.status(400).json({ error: 'Invalid staff role specified.' });
  }
  const emailClean = String(email).trim().toLowerCase();
  const idClean = String(university_id).trim().toUpperCase();
  const exists = db
    .prepare('SELECT id FROM users WHERE lower(email) = ? OR upper(university_id) = ?')
    .get(emailClean, idClean);
  if (exists) {
    return res.status(409).json({ error: 'User with this email or Employee ID already exists.' });
  }
  const hash = bcrypt.hashSync(String(password || 'Password@123'), 10);
  const result = db
    .prepare(
      'INSERT INTO users (full_name, email, password_hash, role, university_id, department, specialty, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
    )
    .run(String(full_name).trim(), emailClean, hash, role, idClean, String(department).trim(), specialty || null);

  const created = db
    .prepare('SELECT id, full_name, email, role, university_id, department, specialty, is_approved, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid);
  logAudit(req.user!.id, 'CREATE_STAFF_ACCOUNT', 'USER', result.lastInsertRowid as number, `${role} ${idClean}`);
  return res.status(201).json({ user: created });
});

app.patch('/api/directory/users/:id/approval', requireAuth, requireRole('ADMIN'), (req: AuthedRequest, res: Response) => {
  const targetId = Number(req.params.id);
  const { is_approved } = req.body || {};
  db.prepare('UPDATE users SET is_approved = ? WHERE id = ?').run(is_approved ? 1 : 0, targetId);
  logAudit(req.user!.id, 'UPDATE_USER_APPROVAL', 'USER', targetId, `Approved=${Boolean(is_approved)}`);
  return res.json({ ok: true });
});

// ==========================================
// FILE UPLOAD ROUTE
// ==========================================

app.post('/api/upload', requireAuth, (req: AuthedRequest, res: Response) => {
  upload.array('files', 5)(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'File upload failed.' });
    }
    const files = (req.files as Express.Multer.File[]) || [];
    const uploaded = files.map((f) => ({
      file_name: f.originalname,
      file_url: `/uploads/${f.filename}`,
      file_type: f.mimetype,
      file_size: f.size,
    }));
    return res.json({ files: uploaded });
  });
});

// ==========================================
// COMPLAINTS ROUTES
// ==========================================

app.get('/api/complaints/track/:complaintCode', (req: Request, res: Response) => {
  const code = String(req.params.complaintCode).trim().toUpperCase();
  const row = db
    .prepare(`
      SELECT c.id, c.complaint_id, c.title, c.category, c.subcategory, c.department, c.location,
             c.priority, c.status, c.created_at, c.updated_at, c.resolved_at,
             f.full_name as faculty_name, a.full_name as assigned_to_name
      FROM complaints c
      LEFT JOIN users f ON c.faculty_id = f.id
      LEFT JOIN users a ON c.assigned_to = a.id
      WHERE upper(c.complaint_id) = ?
    `)
    .get(code) as any;

  if (!row) {
    return res.status(404).json({ error: `No complaint found matching ID "${code}".` });
  }

  const history = db
    .prepare(`
      SELECT h.id, h.old_status, h.new_status, h.remarks, h.timestamp,
             u.full_name as updated_by_name, u.role as updated_by_role
      FROM complaint_history h
      JOIN users u ON h.updated_by = u.id
      WHERE h.complaint_id = ?
      ORDER BY h.timestamp ASC, h.id ASC
    `)
    .all(row.id);

  return res.json({ complaint: row, history });
});

app.get('/api/complaints', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = req.user!;
  const { status, category, priority, department, search, from, to } = req.query;

  const rows = db
    .prepare(`
      SELECT c.*,
             s.full_name as student_name, s.university_id as student_usn, s.email as student_email,
             f.full_name as faculty_name, f.department as faculty_department,
             a.full_name as assigned_to_name, a.role as assigned_to_role
      FROM complaints c
      JOIN users s ON c.student_id = s.id
      LEFT JOIN users f ON c.faculty_id = f.id
      LEFT JOIN users a ON c.assigned_to = a.id
      ORDER BY c.created_at DESC
    `)
    .all() as any[];

  let filtered = rows.filter((r) => canAccessComplaint(r, user));

  if (status && status !== 'ALL') {
    filtered = filtered.filter((r) => r.status === String(status));
  }
  if (category && category !== 'ALL') {
    filtered = filtered.filter((r) => r.category === String(category));
  }
  if (priority && priority !== 'ALL') {
    filtered = filtered.filter((r) => r.priority === String(priority));
  }
  if (department && department !== 'ALL') {
    filtered = filtered.filter((r) => r.department === String(department));
  }
  if (from) {
    filtered = filtered.filter((r) => r.created_at >= String(from));
  }
  if (to) {
    filtered = filtered.filter((r) => r.created_at <= `${String(to)} 23:59:59`);
  }
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.complaint_id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        (!r.is_anonymous && r.student_name.toLowerCase().includes(q))
    );
  }

  const complaints = filtered.map((r) => formatComplaintRow(r, user.role, user.id));
  return res.json({ complaints });
});

app.get('/api/complaints/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = req.user!;
  const idParam = req.params.id;
  const row = db
    .prepare(`
      SELECT c.*,
             s.full_name as student_name, s.university_id as student_usn, s.email as student_email,
             f.full_name as faculty_name, f.department as faculty_department,
             a.full_name as assigned_to_name, a.role as assigned_to_role
      FROM complaints c
      JOIN users s ON c.student_id = s.id
      LEFT JOIN users f ON c.faculty_id = f.id
      LEFT JOIN users a ON c.assigned_to = a.id
      WHERE c.id = ? OR upper(c.complaint_id) = upper(?)
    `)
    .get(Number(idParam) || -1, String(idParam)) as any;

  if (!row) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }
  if (!canAccessComplaint(row, user)) {
    return res.status(403).json({ error: 'You are not authorized to view this complaint.' });
  }

  const formatted = formatComplaintRow(row, user.role, user.id);

  const attachments = db
    .prepare(`
      SELECT ca.*, u.full_name as uploader_name, u.role as uploader_role
      FROM complaint_attachments ca
      JOIN users u ON ca.uploaded_by = u.id
      WHERE ca.complaint_id = ?
      ORDER BY ca.created_at ASC
    `)
    .all(row.id)
    .map((att: any) => {
      if (row.is_anonymous && user.role !== 'ADMIN' && att.uploaded_by === row.student_id) {
        return { ...att, uploader_name: 'Anonymous Student' };
      }
      return att;
    });

  const comments = db
    .prepare(`
      SELECT cc.*, u.full_name as user_name, u.role as user_role
      FROM complaint_comments cc
      JOIN users u ON cc.user_id = u.id
      WHERE cc.complaint_id = ?
      ORDER BY cc.created_at ASC
    `)
    .all(row.id)
    .map((c: any) => {
      if (row.is_anonymous && user.role !== 'ADMIN' && c.user_id === row.student_id) {
        return { ...c, user_name: 'Anonymous Student' };
      }
      return c;
    });

  const history = db
    .prepare(`
      SELECT ch.*, u.full_name as updated_by_name, u.role as updated_by_role
      FROM complaint_history ch
      JOIN users u ON ch.updated_by = u.id
      WHERE ch.complaint_id = ?
      ORDER BY ch.timestamp ASC, ch.id ASC
    `)
    .all(row.id)
    .map((h: any) => {
      if (row.is_anonymous && user.role !== 'ADMIN' && h.updated_by === row.student_id) {
        return { ...h, updated_by_name: 'Anonymous Student' };
      }
      return h;
    });

  const management_notes =
    user.role === 'ADMIN'
      ? db
          .prepare(`
            SELECT mn.*, u.full_name as admin_name
            FROM management_notes mn
            JOIN users u ON mn.admin_id = u.id
            WHERE mn.complaint_id = ?
            ORDER BY mn.created_at DESC
          `)
          .all(row.id)
      : [];

  const feedback = db
    .prepare('SELECT * FROM resolution_feedback WHERE complaint_id = ?')
    .get(row.id);

  return res.json({
    complaint: {
      ...formatted,
      attachments,
      comments,
      history,
      management_notes,
      feedback: feedback || null,
    },
  });
});

app.post('/api/complaints', requireAuth, requireRole('STUDENT'), (req: AuthedRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      title,
      description,
      category,
      subcategory,
      department,
      semester,
      section,
      location,
      faculty_id,
      tagged_faculty_ids,
      priority,
      is_anonymous,
      attachments,
    } = req.body || {};

    if (!title || !description || !category || !department || !location) {
      return res.status(400).json({ error: 'Title, description, category, department, and location are required.' });
    }

    const taggedIds: number[] = Array.isArray(tagged_faculty_ids)
      ? tagged_faculty_ids.map(Number).filter((n) => !Number.isNaN(n) && n > 0)
      : [];
    const primaryFacultyId = faculty_id ? Number(faculty_id) : taggedIds[0] || null;
    if (primaryFacultyId && !taggedIds.includes(primaryFacultyId)) {
      taggedIds.unshift(primaryFacultyId);
    }

    const validPriority = ['Low', 'Medium', 'High', 'Critical'].includes(priority) ? priority : 'Medium';
    const deadlineDays = validPriority === 'Critical' ? 2 : validPriority === 'High' ? 4 : validPriority === 'Medium' ? 7 : 10;
    const deadlineDate = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

    const complaintCode = generateComplaintCode();

    const insertResult = db
      .prepare(`
        INSERT INTO complaints (
          complaint_id, student_id, title, description, category, subcategory,
          department, semester, section, location, faculty_id, tagged_faculty_ids,
          priority, status, is_anonymous, deadline_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?)
      `)
      .run(
        complaintCode,
        user.id,
        String(title).trim(),
        String(description).trim(),
        String(category).trim(),
        String(subcategory || '').trim(),
        String(department).trim(),
        semester || user.semester || null,
        section || user.section || null,
        String(location).trim(),
        primaryFacultyId,
        JSON.stringify(taggedIds),
        validPriority,
        is_anonymous ? 1 : 0,
        deadlineDate
      );

    const newId = insertResult.lastInsertRowid as number;

    if (Array.isArray(attachments)) {
      const insertAtt = db.prepare(`
        INSERT INTO complaint_attachments (complaint_id, uploaded_by, file_name, file_url, file_type, file_size, attachment_kind)
        VALUES (?, ?, ?, ?, ?, ?, 'EVIDENCE')
      `);
      for (const att of attachments) {
        if (att && att.file_url && att.file_name) {
          insertAtt.run(newId, user.id, att.file_name, att.file_url, att.file_type || 'application/octet-stream', Number(att.file_size || 0));
        }
      }
    }

    const taggedRemark =
      taggedIds.length > 0
        ? `Submitted${is_anonymous ? ' anonymously' : ''} with ${taggedIds.length} faculty member(s) tagged.`
        : `Submitted${is_anonymous ? ' anonymously' : ''} to University Grievance Cell.`;

    db.prepare(
      'INSERT INTO complaint_history (complaint_id, old_status, new_status, updated_by, remarks) VALUES (?, NULL, ?, ?, ?)'
    ).run(newId, 'SUBMITTED', user.id, taggedRemark);

    // Notify student
    createNotification(
      user.id,
      `Complaint Registered: ${complaintCode}`,
      `Your complaint "${String(title).trim()}" has been registered and is awaiting review.`,
      newId
    );

    // Notify all tagged faculty
    for (const fid of taggedIds) {
      createNotification(
        fid,
        `Tagged in Complaint ${complaintCode}`,
        `You were tagged in a ${validPriority.toLowerCase()} priority ${category} complaint: "${String(title).trim()}".`,
        newId
      );
    }

    // Notify admins
    notifyAdmins(
      validPriority === 'Critical' ? `Critical Complaint Filed: ${complaintCode}` : `New Complaint: ${complaintCode}`,
      `${category} complaint in ${department}: "${String(title).trim()}"`,
      newId
    );

    logAudit(user.id, 'CREATE_COMPLAINT', 'COMPLAINT', complaintCode, `Priority=${validPriority}`);

    const createdRow = db
      .prepare(`
        SELECT c.*, s.full_name as student_name, s.university_id as student_usn, f.full_name as faculty_name
        FROM complaints c
        JOIN users s ON c.student_id = s.id
        LEFT JOIN users f ON c.faculty_id = f.id
        WHERE c.id = ?
      `)
      .get(newId);

    return res.status(201).json({ complaint: formatComplaintRow(createdRow, user.role, user.id) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Could not submit complaint.' });
  }
});

app.patch('/api/complaints/:id/status', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = req.user!;
  const complaintNumericId = Number(req.params.id);
  const { status, remarks, assigned_to, priority, deadline_at, attachments, attachment_kind } = req.body || {};

  const existing = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintNumericId) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }
  if (!canAccessComplaint(existing, user)) {
    return res.status(403).json({ error: 'Unauthorized to update this complaint.' });
  }

  // Enforce strict role permissions
  if (user.role === 'STUDENT') {
    if (status !== 'REOPENED' && status !== 'CLOSED') {
      return res.status(403).json({ error: 'Students cannot alter management workflow statuses directly.' });
    }
    if (status === 'REOPENED' && !['RESOLVED', 'CLOSED'].includes(existing.status)) {
      return res.status(400).json({ error: 'Only resolved or closed complaints can be reopened.' });
    }
  }

  if (user.role === 'FACULTY') {
    if (status && !['IN_PROGRESS', 'ACTION_TAKEN'].includes(status)) {
      return res.status(403).json({
        error: 'Faculty cannot close, resolve, or dismiss complaints. Final authority belongs to University Management.',
      });
    }
    if (assigned_to !== undefined || priority !== undefined) {
      return res.status(403).json({ error: 'Only University Management can reassign complaints or alter priority.' });
    }
  }

  if (user.role === 'MAINTENANCE') {
    if (status && !['IN_PROGRESS', 'ACTION_TAKEN'].includes(status)) {
      return res.status(403).json({
        error: 'Maintenance personnel can mark tasks In Progress or Action Taken for management verification.',
      });
    }
    if (assigned_to !== undefined || priority !== undefined) {
      return res.status(403).json({ error: 'Only University Management can reassign tasks or alter priority.' });
    }
  }

  const nextStatus: ComplaintStatus = status || existing.status;
  const nextAssignedTo = assigned_to !== undefined ? (assigned_to ? Number(assigned_to) : null) : existing.assigned_to;
  const nextPriority = priority && ['Low', 'Medium', 'High', 'Critical'].includes(priority) ? priority : existing.priority;
  const nextDeadline = deadline_at !== undefined ? deadline_at : existing.deadline_at;
  const nextResolvedAt =
    nextStatus === 'RESOLVED' || nextStatus === 'CLOSED'
      ? existing.resolved_at || new Date().toISOString().slice(0, 19).replace('T', ' ')
      : nextStatus === 'REOPENED'
      ? null
      : existing.resolved_at;

  db.prepare(`
    UPDATE complaints
    SET status = ?, assigned_to = ?, priority = ?, deadline_at = ?, resolved_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(nextStatus, nextAssignedTo, nextPriority, nextDeadline, nextResolvedAt, existing.id);

  // Save optional supporting/before-after attachments
  if (Array.isArray(attachments)) {
    const insertAtt = db.prepare(`
      INSERT INTO complaint_attachments (complaint_id, uploaded_by, file_name, file_url, file_type, file_size, attachment_kind)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const kind = attachment_kind || (user.role === 'FACULTY' ? 'FACULTY_DOC' : user.role === 'MAINTENANCE' ? 'MAINTENANCE_AFTER' : 'EVIDENCE');
    for (const att of attachments) {
      if (att && att.file_url && att.file_name) {
        insertAtt.run(existing.id, user.id, att.file_name, att.file_url, att.file_type || 'application/octet-stream', Number(att.file_size || 0), kind);
      }
    }
  }

  const statusChanged = nextStatus !== existing.status;
  const assigneeChanged = nextAssignedTo !== existing.assigned_to;
  const priorityChanged = nextPriority !== existing.priority;

  if (statusChanged || assigneeChanged || remarks) {
    let remarkText = String(remarks || '').trim();
    if (!remarkText && assigneeChanged && nextAssignedTo) {
      const assignee = db.prepare('SELECT full_name, role FROM users WHERE id = ?').get(nextAssignedTo) as any;
      remarkText = assignee ? `Assigned to ${assignee.full_name} (${assignee.role}).` : 'Assignee updated.';
    }
    if (!remarkText) {
      remarkText = `Status updated from ${existing.status} to ${nextStatus}.`;
    }

    db.prepare(
      'INSERT INTO complaint_history (complaint_id, old_status, new_status, updated_by, remarks) VALUES (?, ?, ?, ?, ?)'
    ).run(existing.id, existing.status, nextStatus, user.id, remarkText);

    // Notifications
    if (existing.student_id !== user.id) {
      createNotification(
        existing.student_id,
        `Update on ${existing.complaint_id}: ${nextStatus.replace(/_/g, ' ')}`,
        remarkText,
        existing.id
      );
    }
    if (assigneeChanged && nextAssignedTo && nextAssignedTo !== user.id) {
      createNotification(
        nextAssignedTo,
        `Assigned Complaint ${existing.complaint_id}`,
        `Management assigned "${existing.title}" to you. ${remarkText}`,
        existing.id
      );
    }
    if (priorityChanged && nextAssignedTo && nextAssignedTo !== user.id) {
      createNotification(
        nextAssignedTo,
        `Priority Changed on ${existing.complaint_id}`,
        `Priority updated to ${nextPriority} on "${existing.title}".`,
        existing.id
      );
    }
    if (user.role === 'FACULTY' || user.role === 'MAINTENANCE') {
      notifyAdmins(
        `${user.role === 'FACULTY' ? 'Faculty' : 'Maintenance'} Update: ${existing.complaint_id}`,
        `${user.full_name} set status to ${nextStatus.replace(/_/g, ' ')}: ${remarkText}`,
        existing.id
      );
    }
    if (nextStatus === 'ESCALATED' && existing.faculty_id) {
      createNotification(
        existing.faculty_id,
        `Escalated Complaint: ${existing.complaint_id}`,
        `Management escalated "${existing.title}" for immediate attention.`,
        existing.id
      );
    }
  }

  logAudit(user.id, 'UPDATE_COMPLAINT_STATUS', 'COMPLAINT', existing.complaint_id, `${existing.status} -> ${nextStatus}`);

  const updated = db
    .prepare(`
      SELECT c.*, s.full_name as student_name, s.university_id as student_usn, f.full_name as faculty_name, a.full_name as assigned_to_name
      FROM complaints c
      JOIN users s ON c.student_id = s.id
      LEFT JOIN users f ON c.faculty_id = f.id
      LEFT JOIN users a ON c.assigned_to = a.id
      WHERE c.id = ?
    `)
    .get(existing.id);

  return res.json({ complaint: formatComplaintRow(updated, user.role, user.id) });
});

app.post('/api/complaints/:id/comments', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = req.user!;
  const complaintNumericId = Number(req.params.id);
  const { message, attachment_url, attachment_name } = req.body || {};

  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'Comment message cannot be empty.' });
  }

  const existing = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintNumericId) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }
  if (!canAccessComplaint(existing, user)) {
    return res.status(403).json({ error: 'You cannot comment on this complaint.' });
  }

  const result = db
    .prepare(
      'INSERT INTO complaint_comments (complaint_id, user_id, message, attachment_url, attachment_name) VALUES (?, ?, ?, ?, ?)'
    )
    .run(existing.id, user.id, String(message).trim(), attachment_url || null, attachment_name || null);

  db.prepare("UPDATE complaints SET updated_at = datetime('now') WHERE id = ?").run(existing.id);

  // Notify participants
  if (user.id !== existing.student_id) {
    createNotification(
      existing.student_id,
      `New Response on ${existing.complaint_id}`,
      `${user.full_name} (${user.role}) commented: "${String(message).trim().slice(0, 90)}"`,
      existing.id
    );
  }
  if (existing.faculty_id && user.id !== existing.faculty_id) {
    createNotification(
      existing.faculty_id,
      `New Comment on ${existing.complaint_id}`,
      `${existing.is_anonymous && user.id === existing.student_id ? 'Anonymous Student' : user.full_name} posted an update.`,
      existing.id
    );
  }
  if (existing.assigned_to && user.id !== existing.assigned_to && existing.assigned_to !== existing.faculty_id) {
    createNotification(
      existing.assigned_to,
      `New Comment on ${existing.complaint_id}`,
      `${existing.is_anonymous && user.id === existing.student_id ? 'Anonymous Student' : user.full_name} posted an update.`,
      existing.id
    );
  }
  if (user.role !== 'ADMIN') {
    notifyAdmins(
      `Discussion Update: ${existing.complaint_id}`,
      `${user.full_name} (${user.role}) added a comment.`,
      existing.id
    );
  }

  const created = db
    .prepare(`
      SELECT cc.*, u.full_name as user_name, u.role as user_role
      FROM complaint_comments cc
      JOIN users u ON cc.user_id = u.id
      WHERE cc.id = ?
    `)
    .get(result.lastInsertRowid) as any;

  if (existing.is_anonymous && user.role !== 'ADMIN' && created.user_id === existing.student_id) {
    created.user_name = 'Anonymous Student';
  }

  return res.status(201).json({ comment: created });
});

app.post('/api/complaints/:id/notes', requireAuth, requireRole('ADMIN'), (req: AuthedRequest, res: Response) => {
  const user = req.user!;
  const complaintNumericId = Number(req.params.id);
  const { note } = req.body || {};
  if (!note || !String(note).trim()) {
    return res.status(400).json({ error: 'Management note cannot be empty.' });
  }
  const existing = db.prepare('SELECT id, complaint_id FROM complaints WHERE id = ?').get(complaintNumericId) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }
  const result = db
    .prepare('INSERT INTO management_notes (complaint_id, admin_id, note) VALUES (?, ?, ?)')
    .run(existing.id, user.id, String(note).trim());

  const created = db
    .prepare(`
      SELECT mn.*, u.full_name as admin_name
      FROM management_notes mn
      JOIN users u ON mn.admin_id = u.id
      WHERE mn.id = ?
    `)
    .get(result.lastInsertRowid);
  logAudit(user.id, 'ADD_MANAGEMENT_NOTE', 'COMPLAINT', existing.complaint_id);
  return res.status(201).json({ note: created });
});

app.post('/api/complaints/:id/feedback', requireAuth, requireRole('STUDENT'), (req: AuthedRequest, res: Response) => {
  const user = req.user!;
  const complaintNumericId = Number(req.params.id);
  const { rating, feedback } = req.body || {};

  const existing = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintNumericId) as any;
  if (!existing) return res.status(404).json({ error: 'Complaint not found.' });
  if (existing.student_id !== user.id) return res.status(403).json({ error: 'Only the complainant can rate resolution.' });
  if (!['RESOLVED', 'CLOSED'].includes(existing.status)) {
    return res.status(400).json({ error: 'Feedback can be submitted once the complaint is resolved.' });
  }

  const numRating = Number(rating);
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
  }

  db.prepare(`
    INSERT INTO resolution_feedback (complaint_id, student_id, rating, feedback)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(complaint_id) DO UPDATE SET rating = excluded.rating, feedback = excluded.feedback
  `).run(existing.id, user.id, numRating, String(feedback || '').trim());

  const saved = db.prepare('SELECT * FROM resolution_feedback WHERE complaint_id = ?').get(existing.id);
  notifyAdmins(
    `Resolution Feedback Received: ${existing.complaint_id}`,
    `Student rated resolution ${numRating}/5.`,
    existing.id
  );
  return res.status(201).json({ feedback: saved });
});

// ==========================================
// DASHBOARD STATS & ANALYTICS
// ==========================================

app.get('/api/dashboard/stats', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = req.user!;
  const allRows = db.prepare('SELECT * FROM complaints').all() as any[];
  const visible = allRows.filter((r) => canAccessComplaint(r, user));

  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const resolvedCount = visible.filter((c) => ['RESOLVED', 'CLOSED'].includes(c.status)).length;
  const inProgressCount = visible.filter((c) => ['IN_PROGRESS', 'ACTION_TAKEN', 'MANAGEMENT_VERIFICATION'].includes(c.status)).length;
  const pendingCount = visible.filter((c) => ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'AWAITING_STUDENT_RESPONSE', 'REOPENED'].includes(c.status)).length;

  return res.json({
    stats: {
      total: visible.length,
      newCount: visible.filter((c) => c.status === 'SUBMITTED').length,
      pendingReview: visible.filter((c) => c.status === 'UNDER_REVIEW').length,
      assigned: visible.filter((c) => c.status === 'ASSIGNED').length,
      awaitingResponse: visible.filter((c) => ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'AWAITING_STUDENT_RESPONSE'].includes(c.status)).length,
      inProgress: inProgressCount,
      pending: pendingCount,
      resolved: resolvedCount,
      escalated: visible.filter((c) => c.status === 'ESCALATED').length,
      overdue: visible.filter(
        (c) => c.deadline_at && c.deadline_at < nowStr && !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)
      ).length,
    },
  });
});

app.get('/api/analytics', requireAuth, requireRole('ADMIN'), (_req: AuthedRequest, res: Response) => {
  const all = db.prepare('SELECT * FROM complaints').all() as any[];
  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const total = all.length;
  const resolvedRows = all.filter((c) => ['RESOLVED', 'CLOSED'].includes(c.status));
  const resolved = resolvedRows.length;

  let avgResolutionHours = 0;
  if (resolvedRows.length > 0) {
    const totalHours = resolvedRows.reduce((acc, c) => {
      const start = new Date(c.created_at.replace(' ', 'T')).getTime();
      const end = new Date((c.resolved_at || c.updated_at).replace(' ', 'T')).getTime();
      return acc + Math.max(1, (end - start) / (1000 * 60 * 60));
    }, 0);
    avgResolutionHours = Math.round((totalHours / resolvedRows.length) * 10) / 10;
  }

  const categoryMap = new Map<string, number>();
  const deptMap = new Map<string, { total: number; resolved: number; pending: number }>();
  const priorityMap = new Map<string, number>([
    ['Critical', 0],
    ['High', 0],
    ['Medium', 0],
    ['Low', 0],
  ]);
  const monthMap = new Map<string, { submitted: number; resolved: number }>();

  for (const c of all) {
    categoryMap.set(c.category, (categoryMap.get(c.category) || 0) + 1);

    const dEntry = deptMap.get(c.department) || { total: 0, resolved: 0, pending: 0 };
    dEntry.total += 1;
    if (['RESOLVED', 'CLOSED'].includes(c.status)) dEntry.resolved += 1;
    else dEntry.pending += 1;
    deptMap.set(c.department, dEntry);

    priorityMap.set(c.priority, (priorityMap.get(c.priority) || 0) + 1);

    const monthKey = c.created_at.slice(0, 7);
    const mEntry = monthMap.get(monthKey) || { submitted: 0, resolved: 0 };
    mEntry.submitted += 1;
    if (['RESOLVED', 'CLOSED'].includes(c.status)) mEntry.resolved += 1;
    monthMap.set(monthKey, mEntry);
  }

  return res.json({
    analytics: {
      total,
      submitted: all.filter((c) => c.status === 'SUBMITTED').length,
      underReview: all.filter((c) => c.status === 'UNDER_REVIEW').length,
      assigned: all.filter((c) => c.status === 'ASSIGNED').length,
      inProgress: all.filter((c) => c.status === 'IN_PROGRESS').length,
      actionTaken: all.filter((c) => c.status === 'ACTION_TAKEN').length,
      verification: all.filter((c) => c.status === 'MANAGEMENT_VERIFICATION').length,
      resolved: all.filter((c) => c.status === 'RESOLVED').length,
      closed: all.filter((c) => c.status === 'CLOSED').length,
      escalated: all.filter((c) => c.status === 'ESCALATED').length,
      rejected: all.filter((c) => c.status === 'REJECTED').length,
      overdue: all.filter(
        (c) => c.deadline_at && c.deadline_at < nowStr && !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)
      ).length,
      avgResolutionHours,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
      facultyRelatedCount: all.filter((c) => c.category === 'Faculty-Related Issues' || c.faculty_id !== null).length,
      byCategory: Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      byDepartment: Array.from(deptMap.entries())
        .map(([department, counts]) => ({ department, ...counts }))
        .sort((a, b) => b.total - a.total),
      byPriority: Array.from(priorityMap.entries()).map(([priority, count]) => ({ priority, count })),
      monthlyTrends: Array.from(monthMap.entries())
        .map(([month, counts]) => ({ month, ...counts }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    },
  });
});

// ==========================================
// NOTIFICATIONS & CONTACT US
// ==========================================

app.get('/api/notifications', requireAuth, (req: AuthedRequest, res: Response) => {
  const notifications = db
    .prepare(`
      SELECT n.*, c.complaint_id as complaint_code
      FROM notifications n
      LEFT JOIN complaints c ON n.complaint_id = c.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT 60
    `)
    .all(req.user!.id);
  const unreadCount = db
    .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(req.user!.id) as { count: number };
  return res.json({ notifications, unreadCount: unreadCount.count });
});

app.patch('/api/notifications/:id/read', requireAuth, (req: AuthedRequest, res: Response) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(
    Number(req.params.id),
    req.user!.id
  );
  return res.json({ ok: true });
});

app.patch('/api/notifications/read-all', requireAuth, (req: AuthedRequest, res: Response) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user!.id);
  return res.json({ ok: true });
});

app.post('/api/contact', (req: Request, res: Response) => {
  const { full_name, email, subject, message } = req.body || {};
  if (!full_name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All contact form fields are required.' });
  }
  const emailClean = String(email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (String(message).trim().length < 10) {
    return res.status(400).json({ error: 'Message should be at least 10 characters long.' });
  }

  const result = db
    .prepare('INSERT INTO contact_messages (full_name, email, subject, message) VALUES (?, ?, ?, ?)')
    .run(String(full_name).trim(), emailClean, String(subject).trim(), String(message).trim());

  notifyAdmins(
    `New Contact Inquiry: ${String(subject).trim()}`,
    `From ${String(full_name).trim()} (${emailClean}): ${String(message).trim().slice(0, 100)}`,
    null
  );

  return res.status(201).json({
    id: result.lastInsertRowid,
    message: 'Your inquiry has been received by the Campus Support Team.',
  });
});

app.get('/api/contact', requireAuth, requireRole('ADMIN'), (_req: AuthedRequest, res: Response) => {
  const messages = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all();
  return res.json({ messages });
});

// ==========================================
// VITE / STATIC SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Campus Complaint Management Portal listening on http://localhost:${PORT}`);
  });
}

startServer();
