import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Shield,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { BrandMark } from '../components/GlassUI';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Department, UserProfile } from '../types';

interface AuthPagesProps {
  mode: 'selection' | 'student' | 'faculty' | 'staff';
  onNavigate: (path: string) => void;
}

export function AuthPages({ mode, onNavigate }: AuthPagesProps) {
  const { loginSuccess, pushToast } = useAuth();

  // Shared states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Student Registration toggle & fields
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [usn, setUsn] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [semester, setSemester] = useState('5th Semester');
  const [section, setSection] = useState('Section A');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);

  // Staff role tab on staff-login
  const [staffRole, setStaffRole] = useState<'ADMIN' | 'MAINTENANCE'>('ADMIN');

  // Forgot password modal
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');

  useEffect(() => {
    setError('');
    setPassword('');
    setIdentifier('');
    setIsRegister(false);
  }, [mode]);

  useEffect(() => {
    apiRequest<{ departments: Department[] }>('/api/directory/departments')
      .then((d) => setDepartments(d.departments))
      .catch(() => {});
  }, []);

  const redirectByRole = (role: UserProfile['role']) => {
    if (role === 'ADMIN') onNavigate('/dashboard/admin');
    else if (role === 'FACULTY') onNavigate('/dashboard/faculty');
    else if (role === 'MAINTENANCE') onNavigate('/dashboard/maintenance');
    else onNavigate('/dashboard/student');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) {
      setError('Please enter your email/ID and password.');
      return;
    }
    setSubmitting(true);
    try {
      const expectedRole =
        mode === 'student'
          ? 'STUDENT'
          : mode === 'faculty'
          ? 'FACULTY'
          : staffRole;

      const data = await apiRequest<{ user: UserProfile; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          expectedRole,
          rememberMe,
        }),
      });
      loginSuccess(data.user, data.token, rememberMe);
      pushToast({
        type: 'success',
        title: `Welcome, ${data.user.full_name}`,
        description: `Signed in to ${data.user.role.toLowerCase()} workspace.`,
      });
      redirectByRole(data.user.role);
    } catch (err: any) {
      setError(err.message || 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim() || !usn.trim() || !regEmail.trim() || !regPassword) {
      setError('Please fill in all required registration fields.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (regPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiRequest<{ user: UserProfile; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName.trim(),
          university_id: usn.trim().toUpperCase(),
          email: regEmail.trim(),
          department,
          semester,
          section,
          password: regPassword,
        }),
      });
      loginSuccess(data.user, data.token, true);
      pushToast({
        type: 'success',
        title: 'Student Account Created',
        description: `Registered USN ${data.user.university_id}.`,
      });
      redirectByRole('STUDENT');
    } catch (err: any) {
      setError(err.message || 'Could not create student account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg('');
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier: forgotInput }),
      });
      setForgotMsg(res.message);
    } catch (err: any) {
      setForgotMsg(err.message || 'Unable to process request.');
    }
  };

  const fillDemo = (demoId: string) => {
    setIdentifier(demoId);
    setPassword('Password@123');
    setError('');
  };

  // =====================================
  // C. LOGIN SELECTION PAGE
  // =====================================
  if (mode === 'selection') {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-2xl mx-auto mb-10"
        >
          <p className="text-xs font-semibold text-[#5268A8] mb-2">Role-Based Portal Access</p>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#20242D] text-balance">
            Select Your Campus Portal
          </h1>
          <p className="text-sm sm:text-base text-[#4A4E59] mt-3">
            Choose your designated role to access dedicated complaint submission, faculty response, or grievance oversight workspaces.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            whileHover={{ y: -4 }}
            className="glass-panel rounded-[28px] p-8 flex flex-col justify-between transition-shadow hover:shadow-xl"
          >
            <div>
              <div className="h-12 w-12 rounded-2xl bg-[#5268A8] text-white flex items-center justify-center mb-6 shadow-sm">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h2 className="font-display font-bold text-2xl text-[#20242D]">
                STUDENT LOGIN
              </h2>
              <p className="text-sm text-[#4A4E59] mt-3 leading-relaxed">
                Raise complaints, track progress and make your voice heard.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/student-login')}
              className="mt-8 w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-[#5268A8] hover:bg-[#3F5289] text-white text-sm font-semibold transition-colors"
            >
              <span>Continue as Student</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            whileHover={{ y: -4 }}
            className="glass-panel rounded-[28px] p-8 flex flex-col justify-between transition-shadow hover:shadow-xl"
          >
            <div>
              <div className="h-12 w-12 rounded-2xl bg-[#20242D] text-white flex items-center justify-center mb-6 shadow-sm">
                <UserCheck className="h-6 w-6" />
              </div>
              <h2 className="font-display font-bold text-2xl text-[#20242D]">
                FACULTY LOGIN
              </h2>
              <p className="text-sm text-[#4A4E59] mt-3 leading-relaxed">
                View assigned complaints, respond to concerns and manage updates.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/faculty-login')}
              className="mt-8 w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-[#20242D] hover:bg-[#323744] text-white text-sm font-semibold transition-colors"
            >
              <span>Continue as Faculty</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        </div>

        {/* Discreet Admin & Maintenance Login bar */}
        <div className="mt-8 glass-panel-subtle rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-[#5268A8] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#20242D]">University Management & Maintenance Staff</p>
              <p className="text-xs text-[#5A5E69]">Secure portal for administration oversight and campus engineering tasks.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/staff-login')}
            className="px-4 py-2.5 rounded-xl bg-white/70 hover:bg-white/90 text-[#20242D] text-xs font-semibold border border-white/80 transition-colors whitespace-nowrap"
          >
            Staff & Admin Login
          </button>
        </div>
      </div>
    );
  }

  // =====================================
  // A. STUDENT LOGIN & REGISTRATION
  // B. FACULTY LOGIN
  // STAFF LOGIN (ADMIN / MAINTENANCE)
  // =====================================
  const heading =
    mode === 'student'
      ? isRegister
        ? 'Create Student Account.'
        : 'Welcome Back, Student.'
      : mode === 'faculty'
      ? 'Welcome Back, Faculty.'
      : staffRole === 'ADMIN'
      ? 'University Management.'
      : 'Maintenance Operations.';

  const subtitle =
    mode === 'student'
      ? isRegister
        ? 'Register with your USN and university email to report issues and track resolutions.'
        : 'Sign in to raise concerns, track complaints and stay connected with your university.'
      : mode === 'faculty'
      ? 'Manage assigned complaints, respond to student concerns and contribute to a better campus.'
      : 'Review grievances, coordinate campus investigations, and verify infrastructure resolutions.';

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-[30px] p-7 sm:p-10"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BrandMark size={40} />
            <div>
              <span className="text-xs font-semibold text-[#5268A8] block">
                {mode === 'student'
                  ? 'Student Portal'
                  : mode === 'faculty'
                  ? 'Faculty Portal'
                  : 'Authorized Staff Portal'}
              </span>
              <span className="text-xs text-[#5A5E69]">Campus Complaint System</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/login')}
            className="text-xs font-semibold text-[#5268A8] hover:underline"
          >
            Switch Role
          </button>
        </div>

        <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#20242D]">
          {heading}
        </h1>
        <p className="text-sm text-[#4A4E59] mt-2 leading-relaxed">{subtitle}</p>

        {mode === 'staff' && (
          <div className="mt-5 grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-white/45 border border-white/60">
            <button
              type="button"
              onClick={() => {
                setStaffRole('ADMIN');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                staffRole === 'ADMIN' ? 'bg-[#5268A8] text-white shadow-sm' : 'text-[#292B32] hover:bg-white/60'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Management / Admin</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStaffRole('MAINTENANCE');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                staffRole === 'MAINTENANCE' ? 'bg-[#5268A8] text-white shadow-sm' : 'text-[#292B32] hover:bg-white/60'
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Maintenance Staff</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-2xl bg-[#A63A3A]/10 border border-[#A63A3A]/25 px-4 py-3 text-xs font-semibold text-[#A63A3A]">
            {error}
          </div>
        )}

        {mode === 'student' && isRegister ? (
          <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#292B32] mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ananya Sharma"
                  required
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm text-[#20242D]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#292B32] mb-1.5">USN</label>
                <input
                  type="text"
                  value={usn}
                  onChange={(e) => setUsn(e.target.value)}
                  placeholder="e.g. ENG25CS0588"
                  required
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#20242D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292B32] mb-1.5">University Email</label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="name@university.edu"
                required
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm text-[#20242D]"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-[#292B32] mb-1.5">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm text-[#20242D]"
                >
                  {(departments.length > 0
                    ? departments
                    : [
                        { name: 'Computer Science & Engineering' },
                        { name: 'Electronics & Communication' },
                        { name: 'Mechanical Engineering' },
                        { name: 'Civil Engineering' },
                      ]
                  ).map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#292B32] mb-1.5">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-sm text-[#20242D]"
                >
                  {['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester'].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#292B32] mb-1.5">Section</label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-sm text-[#20242D]"
                >
                  {['Section A', 'Section B', 'Section C', 'Section D'].map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#292B32] mb-1.5">Password</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm text-[#20242D]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#292B32] mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm text-[#20242D]"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-2xl bg-[#5268A8] hover:bg-[#3F5289] text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {submitting ? 'Creating Account...' : 'Create Student Account'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError('');
                }}
                className="w-full py-2.5 rounded-xl bg-white/50 hover:bg-white/75 text-xs font-semibold text-[#292B32] transition-colors"
              >
                Already registered? Login as Student
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#292B32] mb-1.5">
                {mode === 'student'
                  ? 'University Email / USN'
                  : mode === 'faculty'
                  ? 'Faculty Email / Employee ID'
                  : 'Staff Email / Employee ID'}
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={
                  mode === 'student'
                    ? 'aarav.sharma@university.edu or ENG25CS0104'
                    : mode === 'faculty'
                    ? 'dr.ananya.rao@university.edu or FAC2021004'
                    : staffRole === 'ADMIN'
                    ? 'dean.management@university.edu or ADM2018001'
                    : 'rakesh.electrical@university.edu or MNT2022007'
                }
                required
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-[#20242D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292B32] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full glass-input rounded-xl pl-4 pr-11 py-3 text-sm text-[#20242D]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#5A5E69] hover:text-[#20242D]"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 cursor-pointer text-[#3A3E48]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#20242D]/25 accent-[#5268A8]"
                />
                <span>Remember Me</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotOpen(true);
                  setForgotMsg('');
                }}
                className="font-semibold text-[#5268A8] hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-[#5268A8] hover:bg-[#3F5289] text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
              >
                {submitting
                  ? 'Signing In...'
                  : mode === 'student'
                  ? 'Login as Student'
                  : mode === 'faculty'
                  ? 'Login as Faculty'
                  : staffRole === 'ADMIN'
                  ? 'Login as Management'
                  : 'Login as Maintenance'}
              </button>

              {mode === 'student' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError('');
                  }}
                  className="w-full py-3 rounded-2xl bg-white/60 hover:bg-white/85 text-[#20242D] border border-white/75 text-sm font-semibold transition-colors"
                >
                  Create Student Account
                </button>
              )}

              {mode === 'faculty' && (
                <p className="text-xs text-center text-[#5A5E69] pt-1">
                  Faculty accounts are provisioned and approved by University Administration.
                </p>
              )}
            </div>
          </form>
        )}

        {/* Development Demo Quick-Fill Helper */}
        {!isRegister && (
          <div className="mt-7 pt-5 border-t border-[#20242D]/10">
            <p className="text-[11px] font-semibold text-[#5A5E69] mb-2">
              Development Demo Accounts (Password: <span className="font-mono">Password@123</span>)
            </p>
            <div className="flex flex-wrap gap-2">
              {mode === 'student' && (
                <>
                  <button
                    type="button"
                    onClick={() => fillDemo('ENG25CS0104')}
                    className="px-3 py-1.5 rounded-xl bg-white/55 hover:bg-white/80 text-xs font-medium text-[#20242D] border border-white/70 transition-colors"
                  >
                    Fill Aarav (ENG25CS0104)
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('ENG25CS0587')}
                    className="px-3 py-1.5 rounded-xl bg-white/55 hover:bg-white/80 text-xs font-medium text-[#20242D] border border-white/70 transition-colors"
                  >
                    Fill Mahi (ENG25CS0587)
                  </button>
                </>
              )}
              {mode === 'faculty' && (
                <>
                  <button
                    type="button"
                    onClick={() => fillDemo('FAC2021004')}
                    className="px-3 py-1.5 rounded-xl bg-white/55 hover:bg-white/80 text-xs font-medium text-[#20242D] border border-white/70 transition-colors"
                  >
                    Fill Dr. Ananya Rao (CSE)
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('FAC2019018')}
                    className="px-3 py-1.5 rounded-xl bg-white/55 hover:bg-white/80 text-xs font-medium text-[#20242D] border border-white/70 transition-colors"
                  >
                    Fill Prof. Vikram Mehta (ECE)
                  </button>
                </>
              )}
              {mode === 'staff' && staffRole === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => fillDemo('ADM2018001')}
                  className="px-3 py-1.5 rounded-xl bg-white/55 hover:bg-white/80 text-xs font-medium text-[#20242D] border border-white/70 transition-colors"
                >
                  Fill Dean Management (ADM2018001)
                </button>
              )}
              {mode === 'staff' && staffRole === 'MAINTENANCE' && (
                <button
                  type="button"
                  onClick={() => fillDemo('MNT2022007')}
                  className="px-3 py-1.5 rounded-xl bg-white/55 hover:bg-white/80 text-xs font-medium text-[#20242D] border border-white/70 transition-colors"
                >
                  Fill Rakesh Electrical (MNT2022007)
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#20242D]/35 backdrop-blur-sm">
          <div className="glass-panel-strong rounded-3xl p-6 max-w-md w-full">
            <div className="flex items-center gap-2.5 text-[#20242D] mb-2">
              <KeyRound className="h-5 w-5 text-[#5268A8]" />
              <h3 className="font-display font-bold text-lg">Reset Password</h3>
            </div>
            <p className="text-xs text-[#4A4E59] leading-relaxed">
              Enter your University Email, USN, or Employee ID to initiate recovery with the IT Helpdesk.
            </p>
            <form onSubmit={handleForgotSubmit} className="mt-4 space-y-3">
              <input
                type="text"
                value={forgotInput}
                onChange={(e) => setForgotInput(e.target.value)}
                placeholder="Email or University ID"
                required
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm text-[#20242D]"
              />
              {forgotMsg && (
                <p className="text-xs font-medium text-[#256D4F]">{forgotMsg}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4A4E59] hover:bg-white/60"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#5268A8] text-white text-xs font-semibold"
                >
                  Send Recovery Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
