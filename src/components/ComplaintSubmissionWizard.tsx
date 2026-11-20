import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  EyeOff,
  FileText,
  Paperclip,
  Search,
  Trash2,
  UploadCloud,
  UserPlus,
  X,
} from 'lucide-react';
import { apiRequest, uploadFiles } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { COMPLAINT_CATEGORIES, type ComplaintPriority, type ComplaintRecord, type Department } from '../types';

interface FacultyDirectoryItem {
  id: number;
  full_name: string;
  email: string;
  university_id: string;
  department: string;
  specialty?: string | null;
}

interface ComplaintSubmissionWizardProps {
  onSubmitted: (complaint: ComplaintRecord) => void;
  onTrackComplaint: (complaint: ComplaintRecord) => void;
  onCancel: () => void;
}

const SUBCATEGORY_SUGGESTIONS: Record<string, string[]> = {
  Academics: ['Syllabus & Grading', 'Lecture Scheduling', 'Lab Equipment', 'Course Materials'],
  'Faculty-Related Issues': ['Attendance Dispute', 'Evaluation Transparency', 'Communication', 'Mentorship'],
  Examination: ['Internal Marks Review', 'Exam Timetable', 'Hall Ticket', 'Revaluation Query'],
  Infrastructure: ['Building Repairs', 'Elevator / Stairwell', 'Power Backup', 'Parking & Pathways'],
  'Classroom Maintenance': ['Audio-Visual / Projector', 'Air Conditioning', 'Seating / Desks', 'Lighting'],
  Hostel: ['Room Maintenance', 'Mess & Dining', 'Hostel Security', 'Laundry & Common Room'],
  'Drinking Water': ['Water Purifier / RO', 'Water Cooler Leak', 'Water Availability'],
  'Washroom and Sanitation': ['Restroom Hygiene', 'Plumbing Leak', 'Exhaust & Ventilation'],
  Library: ['Book Availability', 'Quiet Zone', 'Digital Resources', 'Extended Hours'],
  Transportation: ['Shuttle Capacity', 'Route Timing', 'Vehicle Condition'],
  'Internet and Wi-Fi': ['Campus Wi-Fi Drops', 'Lab LAN Port', 'Portal Access'],
  Administration: ['Fee & Scholarship Desk', 'Certificates & ID Card', 'Document Verification'],
  'Harassment and Misconduct': ['Student Misconduct', 'Safety Concern', 'Code of Conduct Violation'],
  Other: ['General Campus Feedback', 'Student Welfare', 'Other'],
};

export function ComplaintSubmissionWizard({
  onSubmitted,
  onTrackComplaint,
  onCancel,
}: ComplaintSubmissionWizardProps) {
  const { user, pushToast, refreshNotifications } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(COMPLAINT_CATEGORIES[0]);
  const [subcategory, setSubcategory] = useState('Syllabus & Grading');
  const [priority, setPriority] = useState<ComplaintPriority>('Medium');
  const [description, setDescription] = useState('');

  const [department, setDepartment] = useState(user?.department || 'Computer Science & Engineering');
  const [semester, setSemester] = useState(user?.semester || '5th Semester');
  const [section, setSection] = useState(user?.section || 'Section A');
  const [location, setLocation] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Faculty tagging
  const [facultyList, setFacultyList] = useState<FacultyDirectoryItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [facultySearch, setFacultySearch] = useState('');
  const [facultyDeptFilter, setFacultyDeptFilter] = useState('All');
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<number[]>([]);

  // Attachments
  const [uploadedFiles, setUploadedFiles] = useState<
    { file_name: string; file_url: string; file_type: string; file_size: number }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdComplaint, setCreatedComplaint] = useState<ComplaintRecord | null>(null);

  useEffect(() => {
    apiRequest<{ faculty: FacultyDirectoryItem[] }>('/api/directory/faculty')
      .then((d) => setFacultyList(d.faculty))
      .catch(() => {});
    apiRequest<{ departments: Department[] }>('/api/directory/departments')
      .then((d) => setDepartments(d.departments))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const list = SUBCATEGORY_SUGGESTIONS[category] || ['General'];
    setSubcategory(list[0]);
  }, [category]);

  const filteredFaculty = useMemo(() => {
    return facultyList.filter((f) => {
      const deptMatch = facultyDeptFilter === 'All' || f.department === facultyDeptFilter;
      const q = facultySearch.trim().toLowerCase();
      const textMatch =
        !q ||
        f.full_name.toLowerCase().includes(q) ||
        f.department.toLowerCase().includes(q) ||
        (f.specialty && f.specialty.toLowerCase().includes(q));
      return deptMatch && textMatch;
    });
  }, [facultyList, facultyDeptFilter, facultySearch]);

  const toggleFaculty = (id: number) => {
    setSelectedFacultyIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError('');

    const files = Array.from(fileList);
    if (uploadedFiles.length + files.length > 5) {
      setError('Maximum 5 supporting files allowed per complaint.');
      return;
    }

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`"${file.name}" exceeds the 10 MB file size limit.`);
        return;
      }
    }

    setUploading(true);
    setUploadProgress(35);
    try {
      const res = await uploadFiles(files);
      setUploadProgress(100);
      setUploadedFiles((prev) => [...prev, ...res.files]);
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 250);
    }
  };

  const validateStep = (currentStep: 1 | 2 | 3) => {
    setError('');
    if (currentStep === 1) {
      if (title.trim().length < 5) {
        setError('Please provide a clear complaint title (at least 5 characters).');
        return false;
      }
      if (description.trim().length < 15) {
        setError('Please describe the issue in detail (at least 15 characters).');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!location.trim()) {
        setError('Please specify the campus building, block, or room location.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2)) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await apiRequest<{ complaint: ComplaintRecord }>('/api/complaints', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          subcategory,
          department,
          semester,
          section,
          location: location.trim(),
          faculty_id: selectedFacultyIds[0] || null,
          tagged_faculty_ids: selectedFacultyIds,
          priority,
          is_anonymous: isAnonymous,
          attachments: uploadedFiles,
        }),
      });
      setCreatedComplaint(res.complaint);
      await refreshNotifications();
      pushToast({
        type: 'success',
        title: `Complaint ${res.complaint.complaint_id} Submitted`,
        description:
          selectedFacultyIds.length > 0
            ? `Notified ${selectedFacultyIds.length} tagged faculty member(s) and University Management.`
            : 'Routed to University Management for review.',
      });
      onSubmitted(res.complaint);
    } catch (err: any) {
      setError(err.message || 'Could not submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  if (createdComplaint) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel rounded-3xl p-8 sm:p-10 text-center max-w-2xl mx-auto"
      >
        <div className="h-14 w-14 rounded-2xl bg-[#256D4F]/15 text-[#256D4F] flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#20242D]">
          Complaint Registered Successfully
        </h2>
        <p className="text-sm text-[#4A4E59] mt-2 leading-relaxed">
          Your submission has been recorded in the university grievance database and notifications have been sent.
        </p>

        <div className="mt-6 rounded-2xl bg-white/60 border border-white/80 p-5 inline-block min-w-[260px]">
          <p className="text-xs text-[#5A5E69]">Generated Reference ID</p>
          <p className="font-mono font-bold text-2xl text-[#5268A8] mt-1 tracking-wide">
            {createdComplaint.complaint_id}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onTrackComplaint(createdComplaint)}
            className="px-6 py-3 rounded-xl bg-[#5268A8] hover:bg-[#3F5289] text-white text-sm font-semibold transition-colors"
          >
            Track Complaint
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-3 rounded-xl bg-white/65 hover:bg-white/90 text-[#20242D] text-sm font-semibold border border-white/75 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 max-w-4xl mx-auto">
      {/* Header & Stepper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#20242D]/10">
        <div>
          <p className="text-xs font-semibold text-[#5268A8]">Step {step} of 3</p>
          <h2 className="font-display font-bold text-2xl text-[#20242D] mt-0.5">
            {step === 1
              ? 'Describe the Issue'
              : step === 2
              ? 'Academic Context & Faculty Tagging'
              : 'Supporting Evidence & Review'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                if (s < step || validateStep(step)) setStep(s as 1 | 2 | 3);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                step === s
                  ? 'bg-[#5268A8] text-white'
                  : s < step
                  ? 'bg-white/75 text-[#256D4F]'
                  : 'bg-white/40 text-[#5A5E69]'
              }`}
            >
              0{s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl bg-[#A63A3A]/10 border border-[#A63A3A]/25 px-4 py-3 text-xs font-semibold text-[#A63A3A]">
          {error}
        </div>
      )}

      {/* STEP 1 */}
      {step === 1 && (
        <div className="mt-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#292B32] mb-1.5">
              Complaint Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Concise summary of the problem (e.g. Lab 3B air conditioning leak)"
              className="w-full glass-input rounded-xl px-4 py-3 text-sm text-[#20242D]"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#292B32] mb-1.5">
                Complaint Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm text-[#20242D]"
              >
                {COMPLAINT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292B32] mb-1.5">
                Subcategory
              </label>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm text-[#20242D]"
              >
                {(SUBCATEGORY_SUGGESTIONS[category] || ['General']).map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292B32] mb-1.5">
                Complaint Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm text-[#20242D]"
              >
                {(['Low', 'Medium', 'High', 'Critical'] as ComplaintPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#292B32] mb-1.5">
              Complaint Description
            </label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what happened, when it started, and any steps already taken..."
              className="w-full glass-input rounded-xl px-4 py-3 text-sm text-[#20242D] resize-y"
            />
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="mt-6 space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#292B32] mb-1.5">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm text-[#20242D]"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#292B32] mb-1.5">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm text-[#20242D]"
              >
                {[
                  '1st Semester',
                  '2nd Semester',
                  '3rd Semester',
                  '4th Semester',
                  '5th Semester',
                  '6th Semester',
                  '7th Semester',
                  '8th Semester',
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#292B32] mb-1.5">
                Class / Section
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm text-[#20242D]"
              >
                {['Section A', 'Section B', 'Section C', 'Section D'].map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#292B32] mb-1.5">
              Campus Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Academic Block C · Room C-204 or Hostel Block 2"
              className="w-full glass-input rounded-xl px-4 py-3 text-sm text-[#20242D]"
            />
          </div>

          {/* Searchable Faculty Tagging Section */}
          <div className="rounded-2xl bg-white/45 border border-white/70 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-display font-bold text-sm text-[#20242D] flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-[#5268A8]" />
                  <span>Tag Concerned Faculty Member(s)</span>
                </h3>
                <p className="text-xs text-[#5A5E69] mt-0.5">
                  Tagged faculty receive instant notifications and can provide responses for management review.
                </p>
              </div>
              {selectedFacultyIds.length > 0 && (
                <span className="text-xs font-semibold text-[#5268A8]">
                  {selectedFacultyIds.length} selected
                </span>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="h-4 w-4 text-[#5A5E69] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={facultySearch}
                  onChange={(e) => setFacultySearch(e.target.value)}
                  placeholder="Search faculty by name or specialty..."
                  className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-xs text-[#20242D]"
                />
              </div>
              <select
                value={facultyDeptFilter}
                onChange={(e) => setFacultyDeptFilter(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-[#20242D]"
              >
                <option value="All">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
              {filteredFaculty.map((f) => {
                const selected = selectedFacultyIds.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleFaculty(f.id)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      selected
                        ? 'bg-[#5268A8] text-white border-[#5268A8] shadow-sm'
                        : 'bg-white/60 hover:bg-white/85 text-[#20242D] border-white/75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold truncate">{f.full_name}</span>
                      <span className={`text-[10px] font-mono ${selected ? 'text-white/85' : 'text-[#5A5E69]'}`}>
                        {f.university_id}
                      </span>
                    </div>
                    <p className={`text-[11px] mt-0.5 truncate ${selected ? 'text-white/90' : 'text-[#4A4E59]'}`}>
                      {f.department}
                    </p>
                  </button>
                );
              })}
              {filteredFaculty.length === 0 && (
                <p className="text-xs text-[#5A5E69] py-3 col-span-2 text-center">
                  No faculty members match your filter.
                </p>
              )}
            </div>
          </div>

          {/* Anonymous Toggle */}
          <label className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/45 border border-white/70 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="mt-1 h-4 w-4 rounded accent-[#5268A8]"
            />
            <div>
              <span className="text-sm font-semibold text-[#20242D] flex items-center gap-2">
                <EyeOff className="h-4 w-4 text-[#5268A8]" />
                <span>Submit as Anonymous Complaint</span>
              </span>
              <p className="text-xs text-[#4A4E59] mt-1 leading-relaxed">
                Your name, USN, and email will remain hidden from faculty and maintenance staff. Only authorized University Management can inspect confidential records when policy requires.
              </p>
            </div>
          </label>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="mt-6 space-y-6">
          {/* Drag & Drop File Upload */}
          <div>
            <label className="block text-xs font-semibold text-[#292B32] mb-2">
              Supporting Attachments (Images, PDF, DOC · max 10 MB each)
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handleFilesSelected(e.dataTransfer.files);
              }}
              className={`rounded-2xl border-2 border-dashed p-7 text-center transition-colors ${
                dragActive
                  ? 'border-[#5268A8] bg-[#5268A8]/10'
                  : 'border-[#20242D]/20 bg-white/35 hover:bg-white/50'
              }`}
            >
              <UploadCloud className="h-8 w-8 text-[#5268A8] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#20242D]">
                Drag and drop evidence files here, or browse
              </p>
              <p className="text-xs text-[#5A5E69] mt-1">
                Accepts JPG, PNG, WEBP, PDF, DOCX, TXT (up to 5 files)
              </p>
              <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 hover:bg-white text-xs font-semibold text-[#20242D] border border-white cursor-pointer shadow-sm">
                <Paperclip className="h-3.5 w-3.5 text-[#5268A8]" />
                <span>Select Files</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="hidden"
                />
              </label>

              {uploading && (
                <div className="mt-4 max-w-xs mx-auto">
                  <div className="h-1.5 rounded-full bg-white/60 overflow-hidden">
                    <div
                      className="h-full bg-[#5268A8] transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#5268A8] mt-1 font-medium">Uploading files...</p>
                </div>
              )}
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                {uploadedFiles.map((f, idx) => (
                  <div
                    key={`${f.file_url}_${idx}`}
                    className="rounded-xl bg-white/60 border border-white/80 p-3 flex items-center gap-3"
                  >
                    {f.file_type.startsWith('image/') ? (
                      <img
                        src={f.file_url}
                        alt={f.file_name}
                        className="h-11 w-11 rounded-lg object-cover shrink-0 border border-white"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-lg bg-[#5268A8]/12 text-[#5268A8] flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#20242D] truncate">{f.file_name}</p>
                      <p className="text-[11px] text-[#5A5E69] tabular-nums">
                        {(f.file_size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="p-1.5 rounded-lg text-[#A63A3A] hover:bg-white/70"
                      aria-label="Remove attachment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review Summary */}
          <div className="rounded-2xl bg-white/50 border border-white/75 p-5 space-y-2.5">
            <h3 className="font-display font-bold text-sm text-[#20242D]">Submission Summary</h3>
            <div className="grid sm:grid-cols-2 gap-2 text-xs">
              <p><span className="text-[#5A5E69]">Title:</span> <span className="font-semibold text-[#20242D]">{title}</span></p>
              <p><span className="text-[#5A5E69]">Category:</span> <span className="font-semibold text-[#20242D]">{category} · {subcategory}</span></p>
              <p><span className="text-[#5A5E69]">Department:</span> <span className="font-semibold text-[#20242D]">{department}</span></p>
              <p><span className="text-[#5A5E69]">Location:</span> <span className="font-semibold text-[#20242D]">{location}</span></p>
              <p><span className="text-[#5A5E69]">Priority:</span> <span className="font-semibold text-[#20242D]">{priority}</span></p>
              <p><span className="text-[#5A5E69]">Privacy:</span> <span className="font-semibold text-[#20242D]">{isAnonymous ? 'Anonymous Submission' : 'Standard Identified'}</span></p>
            </div>
            {selectedFacultyIds.length > 0 && (
              <p className="text-xs text-[#5268A8] font-semibold">
                Tagged Faculty:{' '}
                {facultyList
                  .filter((f) => selectedFacultyIds.includes(f.id))
                  .map((f) => f.full_name)
                  .join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="mt-8 pt-5 border-t border-[#20242D]/10 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (step === 1) onCancel();
            else setStep((s) => (s - 1) as 1 | 2);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/60 hover:bg-white/85 text-xs font-semibold text-[#292B32] border border-white/75 transition-colors"
        >
          {step === 1 ? <X className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          <span>{step === 1 ? 'Cancel' : 'Previous'}</span>
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={() => {
              if (validateStep(step)) setStep((s) => (s + 1) as 2 | 3);
            }}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#5268A8] hover:bg-[#3F5289] text-white text-xs font-semibold transition-colors"
          >
            <span>Continue</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting || uploading}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5268A8] hover:bg-[#3F5289] text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{submitting ? 'Submitting Complaint...' : 'Submit Complaint'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
