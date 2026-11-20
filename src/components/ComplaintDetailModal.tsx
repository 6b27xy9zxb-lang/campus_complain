import React, { useCallback, useEffect, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ExternalLink,
  FileText,
  Lock,
  MessageSquare,
  Paperclip,
  Send,
  Shield,
  Star,
  UserCheck,
  X,
} from 'lucide-react';
import { apiRequest, uploadFiles } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { LifecycleTimeline, PriorityIndicator, StatusIndicator } from './GlassUI';
import {
  STATUS_LABELS,
  type ComplaintPriority,
  type ComplaintRecord,
  type ComplaintStatus,
} from '../types';

interface ComplaintDetailModalProps {
  complaintId: number;
  onClose: () => void;
  onUpdated: () => void;
}

export function ComplaintDetailModal({
  complaintId,
  onClose,
  onUpdated,
}: ComplaintDetailModalProps) {
  const { user, pushToast, refreshNotifications } = useAuth();
  const [complaint, setComplaint] = useState<ComplaintRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [commentFile, setCommentFile] = useState<{ file_name: string; file_url: string } | null>(null);
  const [postingComment, setPostingComment] = useState(false);

  // Admin management note state
  const [privateNote, setPrivateNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Workflow update state
  const [nextStatus, setNextStatus] = useState<ComplaintStatus>('UNDER_REVIEW');
  const [nextPriority, setNextPriority] = useState<ComplaintPriority>('Medium');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [remarks, setRemarks] = useState('');
  const [deadlineAt, setDeadlineAt] = useState('');
  const [actionFiles, setActionFiles] = useState<
    { file_name: string; file_url: string; file_type: string; file_size: number }[]
  >([]);
  const [actionFileKind, setActionFileKind] = useState<'FACULTY_DOC' | 'MAINTENANCE_BEFORE' | 'MAINTENANCE_AFTER'>('FACULTY_DOC');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Assignees directory for Admin
  const [staffDirectory, setStaffDirectory] = useState<
    { id: number; full_name: string; role: string; department: string; specialty?: string }[]
  >([]);

  // Student feedback
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<{ complaint: ComplaintRecord }>(`/api/complaints/${complaintId}`);
      setComplaint(data.complaint);
      setNextStatus(data.complaint.status);
      setNextPriority(data.complaint.priority);
      setAssignedTo(data.complaint.assigned_to ? String(data.complaint.assigned_to) : '');
      setDeadlineAt(data.complaint.deadline_at ? data.complaint.deadline_at.slice(0, 10) : '');
      if (user?.role === 'MAINTENANCE') {
        setActionFileKind('MAINTENANCE_AFTER');
      } else {
        setActionFileKind('FACULTY_DOC');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load complaint details.');
    } finally {
      setLoading(false);
    }
  }, [complaintId, user?.role]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      Promise.all([
        apiRequest<{ faculty: any[] }>('/api/directory/faculty'),
        apiRequest<{ maintenance: any[] }>('/api/directory/maintenance'),
      ])
        .then(([fac, mnt]) => {
          setStaffDirectory([
            ...fac.faculty.map((f) => ({ ...f, role: 'FACULTY' })),
            ...mnt.maintenance.map((m) => ({ ...m, role: 'MAINTENANCE' })),
          ]);
        })
        .catch(() => {});
    }
  }, [user?.role]);

  const handleUploadActionFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const res = await uploadFiles(Array.from(files));
      setActionFiles((prev) => [...prev, ...res.files]);
    } catch (err: any) {
      pushToast({ type: 'error', title: 'Upload Error', description: err.message });
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint) return;
    if (nextStatus === 'REJECTED' && !remarks.trim()) {
      pushToast({
        type: 'error',
        title: 'Reason Required',
        description: 'Please include remarks explaining why the complaint is rejected.',
      });
      return;
    }

    setUpdatingStatus(true);
    try {
      await apiRequest(`/api/complaints/${complaint.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          remarks: remarks.trim() || undefined,
          assigned_to: user?.role === 'ADMIN' ? (assignedTo ? Number(assignedTo) : null) : undefined,
          priority: user?.role === 'ADMIN' ? nextPriority : undefined,
          deadline_at: user?.role === 'ADMIN' && deadlineAt ? `${deadlineAt} 17:00:00` : undefined,
          attachments: actionFiles,
          attachment_kind: actionFileKind,
        }),
      });
      setRemarks('');
      setActionFiles([]);
      await loadDetail();
      await refreshNotifications();
      onUpdated();
      pushToast({
        type: 'success',
        title: 'Complaint Updated',
        description: `Status saved as ${STATUS_LABELS[nextStatus] || nextStatus}.`,
      });
    } catch (err: any) {
      pushToast({ type: 'error', title: 'Update Failed', description: err.message });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !commentText.trim()) return;
    setPostingComment(true);
    try {
      await apiRequest(`/api/complaints/${complaint.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          message: commentText.trim(),
          attachment_url: commentFile?.file_url || null,
          attachment_name: commentFile?.file_name || null,
        }),
      });
      setCommentText('');
      setCommentFile(null);
      await loadDetail();
      await refreshNotifications();
      pushToast({ type: 'success', title: 'Comment Posted' });
    } catch (err: any) {
      pushToast({ type: 'error', title: 'Comment Failed', description: err.message });
    } finally {
      setPostingComment(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !privateNote.trim()) return;
    setSavingNote(true);
    try {
      await apiRequest(`/api/complaints/${complaint.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: privateNote.trim() }),
      });
      setPrivateNote('');
      await loadDetail();
      pushToast({ type: 'success', title: 'Internal Note Added' });
    } catch (err: any) {
      pushToast({ type: 'error', title: 'Note Failed', description: err.message });
    } finally {
      setSavingNote(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint) return;
    setSubmittingFeedback(true);
    try {
      await apiRequest(`/api/complaints/${complaint.id}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ rating, feedback: feedbackText.trim() }),
      });
      await loadDetail();
      onUpdated();
      pushToast({ type: 'success', title: 'Thank You', description: 'Your resolution feedback has been recorded.' });
    } catch (err: any) {
      pushToast({ type: 'error', title: 'Feedback Error', description: err.message });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#20242D]/40 backdrop-blur-sm">
      <div className="glass-panel-strong rounded-[28px] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Modal Header */}
        <div className="px-6 py-4 border-b border-[#20242D]/10 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            {complaint ? (
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#5A5E69]">
                <span className="font-mono font-bold text-[#5268A8]">{complaint.complaint_id}</span>
                <span>·</span>
                <span>{complaint.category}</span>
                <span>·</span>
                <span>{complaint.department}</span>
              </div>
            ) : (
              <span className="text-xs font-semibold text-[#5A5E69]">Complaint Record</span>
            )}
            <h2 className="font-display font-bold text-lg sm:text-xl text-[#20242D] truncate mt-0.5">
              {complaint?.title || 'Loading complaint...'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/70 text-[#20242D] transition-colors shrink-0"
            aria-label="Close complaint details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-sm text-[#5A5E69]">Loading complaint details...</div>
          ) : error || !complaint ? (
            <div className="py-12 text-center text-sm text-[#A63A3A]">{error || 'Not found'}</div>
          ) : (
            <>
              {/* Status Bar + Lifecycle Timeline */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <StatusIndicator status={complaint.status} />
                    <PriorityIndicator priority={complaint.priority} />
                    {Boolean(complaint.is_anonymous) && (
                      <span className="text-xs font-semibold text-[#5268A8]">Anonymous Protection Active</span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-[#5A5E69] tabular-nums">
                    Submitted: {complaint.created_at}
                  </span>
                </div>
                <LifecycleTimeline currentStatus={complaint.status} />
              </div>

              {/* Description & Key Metadata */}
              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-5">
                  <div className="rounded-2xl bg-white/55 border border-white/75 p-5">
                    <h3 className="font-display font-bold text-sm text-[#20242D] mb-2">
                      Complaint Description
                    </h3>
                    <p className="text-sm text-[#292B32] leading-relaxed whitespace-pre-line">
                      {complaint.description}
                    </p>
                  </div>

                  {/* Attachments */}
                  <div className="rounded-2xl bg-white/55 border border-white/75 p-5">
                    <h3 className="font-display font-bold text-sm text-[#20242D] mb-3">
                      Evidence & Uploaded Documents ({complaint.attachments?.length || 0})
                    </h3>
                    {!complaint.attachments || complaint.attachments.length === 0 ? (
                      <p className="text-xs text-[#5A5E69]">No attachments uploaded yet.</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {complaint.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 p-3 rounded-xl bg-white/70 hover:bg-white border border-white transition-colors"
                          >
                            {att.file_type.startsWith('image/') ? (
                              <img
                                src={att.file_url}
                                alt={att.file_name}
                                className="h-12 w-12 rounded-lg object-cover shrink-0"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-lg bg-[#5268A8]/12 text-[#5268A8] flex items-center justify-center shrink-0">
                                <FileText className="h-5 w-5" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#20242D] truncate">{att.file_name}</p>
                              <p className="text-[10px] text-[#5A5E69]">
                                {att.attachment_kind.replace(/_/g, ' ')} · {att.uploader_name}
                              </p>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-[#5268A8] shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Discussion Thread */}
                  <div className="rounded-2xl bg-white/55 border border-white/75 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-[#5268A8]" />
                      <h3 className="font-display font-bold text-sm text-[#20242D]">
                        Discussion & Explanations
                      </h3>
                    </div>

                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {!complaint.comments || complaint.comments.length === 0 ? (
                        <p className="text-xs text-[#5A5E69]">No messages posted yet.</p>
                      ) : (
                        complaint.comments.map((c) => (
                          <div
                            key={c.id}
                            className="rounded-xl bg-white/70 border border-white/80 p-3.5"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-[#20242D]">
                                {c.user_name}{' '}
                                <span className="font-normal text-[#5268A8]">· {c.user_role}</span>
                              </span>
                              <span className="font-mono text-[11px] text-[#5A5E69] tabular-nums">
                                {c.created_at}
                              </span>
                            </div>
                            <p className="text-xs text-[#292B32] mt-1.5 leading-relaxed">{c.message}</p>
                            {c.attachment_url && (
                              <a
                                href={c.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-[#5268A8] hover:underline"
                              >
                                <Paperclip className="h-3 w-3" />
                                <span>{c.attachment_name || 'Attachment'}</span>
                              </a>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handlePostComment} className="space-y-2.5 pt-2 border-t border-[#20242D]/10">
                      <textarea
                        rows={2}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a response, update, or clarification..."
                        className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-[#20242D]"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4A4E59] cursor-pointer hover:text-[#5268A8]">
                          <Paperclip className="h-3.5 w-3.5" />
                          <span>{commentFile ? commentFile.file_name : 'Attach document'}</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={async (e) => {
                              if (!e.target.files?.length) return;
                              try {
                                const res = await uploadFiles([e.target.files[0]]);
                                setCommentFile(res.files[0]);
                              } catch (err: any) {
                                pushToast({ type: 'error', title: 'Upload failed', description: err.message });
                              }
                            }}
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={postingComment || !commentText.trim()}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5268A8] hover:bg-[#3F5289] text-white text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>{postingComment ? 'Posting...' : 'Post Reply'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Right Column: Metadata, Workflow Actions, Private Notes & Audit History */}
                <div className="lg:col-span-5 space-y-5">
                  {/* Metadata Grid */}
                  <div className="rounded-2xl bg-white/55 border border-white/75 p-5 space-y-2.5 text-xs">
                    <h3 className="font-display font-bold text-sm text-[#20242D] mb-2">Case Details</h3>
                    <div className="flex justify-between gap-3">
                      <span className="text-[#5A5E69]">Submitted By</span>
                      <span className="font-semibold text-[#20242D] text-right">
                        {complaint.student_name} ({complaint.student_usn})
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-[#5A5E69]">Location</span>
                      <span className="font-semibold text-[#20242D] text-right">{complaint.location}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-[#5A5E69]">Tagged Faculty</span>
                      <span className="font-semibold text-[#5268A8] text-right">
                        {complaint.tagged_faculty_names?.length
                          ? complaint.tagged_faculty_names.join(', ')
                          : 'None tagged'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-[#5A5E69]">Assigned To</span>
                      <span className="font-semibold text-[#20242D] text-right">
                        {complaint.assigned_to_name || 'Unassigned'}
                      </span>
                    </div>
                    {complaint.deadline_at && (
                      <div className="flex justify-between gap-3">
                        <span className="text-[#5A5E69]">Target Deadline</span>
                        <span className="font-mono font-semibold text-[#20242D] tabular-nums">
                          {complaint.deadline_at.slice(0, 10)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Role-Based Workflow Controls */}
                  {user && user.role !== 'STUDENT' && (
                    <form
                      onSubmit={handleStatusUpdate}
                      className="rounded-2xl bg-white/60 border border-white/80 p-5 space-y-3.5"
                    >
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-[#5268A8]" />
                        <h3 className="font-display font-bold text-sm text-[#20242D]">
                          {user.role === 'ADMIN'
                            ? 'Management Action & Assignment'
                            : user.role === 'FACULTY'
                            ? 'Faculty Response & Progress'
                            : 'Maintenance Work Update'}
                        </h3>
                      </div>

                      {user.role === 'FACULTY' && (
                        <p className="text-[11px] text-[#4A4E59] leading-relaxed">
                          You can mark investigations In Progress or Action Taken and upload supporting documents. Final resolution authority belongs exclusively to University Management.
                        </p>
                      )}

                      <div>
                        <label className="block text-[11px] font-semibold text-[#292B32] mb-1">
                          Update Status
                        </label>
                        <select
                          value={nextStatus}
                          onChange={(e) => setNextStatus(e.target.value as ComplaintStatus)}
                          className="w-full glass-input rounded-xl px-3 py-2 text-xs text-[#20242D]"
                        >
                          {user.role === 'ADMIN' ? (
                            (Object.keys(STATUS_LABELS) as ComplaintStatus[]).map((st) => (
                              <option key={st} value={st}>
                                {STATUS_LABELS[st]}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value={complaint.status}>{STATUS_LABELS[complaint.status]} (Keep Current)</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="ACTION_TAKEN">Action Taken (Submit for Verification)</option>
                            </>
                          )}
                        </select>
                      </div>

                      {user.role === 'ADMIN' && (
                        <>
                          <div>
                            <label className="block text-[11px] font-semibold text-[#292B32] mb-1">
                              Assign Investigator / Personnel
                            </label>
                            <select
                              value={assignedTo}
                              onChange={(e) => setAssignedTo(e.target.value)}
                              className="w-full glass-input rounded-xl px-3 py-2 text-xs text-[#20242D]"
                            >
                              <option value="">Unassigned</option>
                              {staffDirectory.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.full_name} ({s.role} · {s.department})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-[#292B32] mb-1">
                                Priority
                              </label>
                              <select
                                value={nextPriority}
                                onChange={(e) => setNextPriority(e.target.value as ComplaintPriority)}
                                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-[#20242D]"
                              >
                                {(['Low', 'Medium', 'High', 'Critical'] as ComplaintPriority[]).map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#292B32] mb-1">
                                Deadline
                              </label>
                              <input
                                type="date"
                                value={deadlineAt}
                                onChange={(e) => setDeadlineAt(e.target.value)}
                                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-[#20242D]"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {(user.role === 'FACULTY' || user.role === 'MAINTENANCE') && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-[#292B32]">
                              {user.role === 'MAINTENANCE'
                                ? 'Upload Before / After Photos'
                                : 'Upload Supporting Document'}
                            </span>
                            {user.role === 'MAINTENANCE' && (
                              <select
                                value={actionFileKind}
                                onChange={(e) => setActionFileKind(e.target.value as any)}
                                className="glass-input rounded-lg px-2 py-1 text-[11px]"
                              >
                                <option value="MAINTENANCE_BEFORE">Before Photo</option>
                                <option value="MAINTENANCE_AFTER">After Photo</option>
                              </select>
                            )}
                          </div>
                          <label className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/70 hover:bg-white border border-white text-xs font-semibold text-[#5268A8] cursor-pointer">
                            <Camera className="h-3.5 w-3.5" />
                            <span>Choose Files ({actionFiles.length} queued)</span>
                            <input
                              type="file"
                              multiple
                              onChange={(e) => handleUploadActionFiles(e.target.files)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-semibold text-[#292B32] mb-1">
                          Action Remarks / Investigation Findings
                        </label>
                        <textarea
                          rows={2}
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="Add remarks recorded in the complaint audit trail..."
                          className="w-full glass-input rounded-xl px-3 py-2 text-xs text-[#20242D]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={updatingStatus}
                        className="w-full py-2.5 rounded-xl bg-[#5268A8] hover:bg-[#3F5289] text-white text-xs font-semibold transition-colors disabled:opacity-60"
                      >
                        {updatingStatus ? 'Saving Update...' : 'Save Workflow Update'}
                      </button>
                    </form>
                  )}

                  {/* Student Feedback or Reopen */}
                  {user?.role === 'STUDENT' && ['RESOLVED', 'CLOSED'].includes(complaint.status) && (
                    <div className="rounded-2xl bg-white/60 border border-white/80 p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[#256D4F]" />
                        <h3 className="font-display font-bold text-sm text-[#20242D]">
                          Resolution Feedback
                        </h3>
                      </div>

                      {complaint.feedback ? (
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-1 text-[#B97729]">
                            {Array.from({ length: complaint.feedback.rating }).map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-current" />
                            ))}
                            <span className="ml-1 font-semibold text-[#20242D]">
                              {complaint.feedback.rating}/5
                            </span>
                          </div>
                          {complaint.feedback.feedback && (
                            <p className="text-[#4A4E59] italic">"{complaint.feedback.feedback}"</p>
                          )}
                        </div>
                      ) : (
                        <form onSubmit={handleSubmitFeedback} className="space-y-3">
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setRating(num)}
                                className="p-1"
                              >
                                <Star
                                  className={`h-5 w-5 ${
                                    num <= rating ? 'text-[#B97729] fill-current' : 'text-[#5A5E69]/40'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <textarea
                            rows={2}
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Share feedback on how your issue was resolved..."
                            className="w-full glass-input rounded-xl px-3 py-2 text-xs text-[#20242D]"
                          />
                          <button
                            type="submit"
                            disabled={submittingFeedback}
                            className="w-full py-2.5 rounded-xl bg-[#256D4F] text-white text-xs font-semibold"
                          >
                            {submittingFeedback ? 'Submitting...' : 'Confirm & Submit Feedback'}
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {/* Admin Private Internal Notes */}
                  {user?.role === 'ADMIN' && (
                    <div className="rounded-2xl bg-[#20242D]/5 border border-[#20242D]/12 p-5 space-y-3">
                      <div className="flex items-center gap-2 text-[#20242D]">
                        <Lock className="h-4 w-4 text-[#5268A8]" />
                        <h3 className="font-display font-bold text-sm">
                          Private Management Notes
                        </h3>
                      </div>
                      <p className="text-[11px] text-[#5A5E69]">
                        Hidden from students, faculty, and maintenance staff.
                      </p>
                      <div className="space-y-2 max-h-36 overflow-y-auto">
                        {complaint.management_notes?.map((n) => (
                          <div key={n.id} className="rounded-xl bg-white/70 p-2.5 text-xs">
                            <p className="text-[#20242D]">{n.note}</p>
                            <p className="text-[10px] text-[#5A5E69] mt-1">
                              {n.admin_name} · {n.created_at}
                            </p>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleAddNote} className="flex gap-2">
                        <input
                          type="text"
                          value={privateNote}
                          onChange={(e) => setPrivateNote(e.target.value)}
                          placeholder="Add confidential management note..."
                          className="flex-1 glass-input rounded-xl px-3 py-2 text-xs text-[#20242D]"
                        />
                        <button
                          type="submit"
                          disabled={savingNote || !privateNote.trim()}
                          className="px-3.5 py-2 rounded-xl bg-[#20242D] text-white text-xs font-semibold disabled:opacity-50"
                        >
                          Save
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Audit Timeline */}
                  <div className="rounded-2xl bg-white/55 border border-white/75 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-4 w-4 text-[#5268A8]" />
                      <h3 className="font-display font-bold text-sm text-[#20242D]">
                        Audit History
                      </h3>
                    </div>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {complaint.history?.map((h) => (
                        <div key={h.id} className="border-b border-[#20242D]/8 pb-2.5 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-bold text-[#20242D]">
                              {h.old_status ? `${h.old_status.replace(/_/g, ' ')} → ` : ''}
                              {h.new_status.replace(/_/g, ' ')}
                            </span>
                            <span className="font-mono text-[#5A5E69] tabular-nums">{h.timestamp}</span>
                          </div>
                          <p className="text-xs text-[#4A4E59] mt-0.5">{h.remarks}</p>
                          <p className="text-[10px] text-[#5A5E69] mt-0.5">
                            By {h.updated_by_name} ({h.updated_by_role})
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
