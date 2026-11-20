export type UserRole = 'STUDENT' | 'FACULTY' | 'ADMIN' | 'MAINTENANCE';

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type ComplaintStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ACTION_TAKEN'
  | 'MANAGEMENT_VERIFICATION'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED'
  | 'ESCALATED'
  | 'REOPENED'
  | 'AWAITING_STUDENT_RESPONSE';

export interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  university_id: string;
  department: string;
  semester?: string | null;
  section?: string | null;
  specialty?: string | null;
  is_approved: number;
  created_at: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  head_name: string;
  created_at: string;
}

export interface AttachmentItem {
  id: number;
  complaint_id: number;
  uploaded_by: number;
  uploader_name?: string;
  uploader_role?: UserRole;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  attachment_kind: 'EVIDENCE' | 'FACULTY_DOC' | 'MAINTENANCE_BEFORE' | 'MAINTENANCE_AFTER' | 'DISCUSSION';
  created_at: string;
}

export interface ComplaintComment {
  id: number;
  complaint_id: number;
  user_id: number;
  user_name: string;
  user_role: UserRole;
  message: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  created_at: string;
}

export interface ComplaintHistoryItem {
  id: number;
  complaint_id: number;
  old_status: string | null;
  new_status: string;
  updated_by: number;
  updated_by_name: string;
  updated_by_role: UserRole;
  remarks: string;
  timestamp: string;
}

export interface ManagementNote {
  id: number;
  complaint_id: number;
  admin_id: number;
  admin_name: string;
  note: string;
  created_at: string;
}

export interface ResolutionFeedback {
  id: number;
  complaint_id: number;
  student_id: number;
  rating: number;
  feedback: string;
  created_at: string;
}

export interface ComplaintRecord {
  id: number;
  complaint_id: string;
  student_id: number | null;
  student_name: string;
  student_usn: string;
  student_email?: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  department: string;
  semester?: string | null;
  section?: string | null;
  location: string;
  faculty_id: number | null;
  faculty_name?: string | null;
  faculty_department?: string | null;
  tagged_faculty_ids: number[];
  tagged_faculty_names?: string[];
  assigned_to: number | null;
  assigned_to_name?: string | null;
  assigned_to_role?: UserRole | null;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  is_anonymous: number;
  deadline_at?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  attachments?: AttachmentItem[];
  comments?: ComplaintComment[];
  history?: ComplaintHistoryItem[];
  management_notes?: ManagementNote[];
  feedback?: ResolutionFeedback | null;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  complaint_id: number | null;
  complaint_code?: string | null;
  is_read: number;
  created_at: string;
}

export interface AnalyticsSummary {
  total: number;
  submitted: number;
  underReview: number;
  assigned: number;
  inProgress: number;
  actionTaken: number;
  verification: number;
  resolved: number;
  closed: number;
  escalated: number;
  rejected: number;
  overdue: number;
  avgResolutionHours: number;
  resolutionRate: number;
  facultyRelatedCount: number;
  byCategory: { category: string; count: number }[];
  byDepartment: { department: string; total: number; resolved: number; pending: number }[];
  byPriority: { priority: string; count: number }[];
  monthlyTrends: { month: string; submitted: number; resolved: number }[];
}

export const COMPLAINT_CATEGORIES = [
  'Academics',
  'Faculty-Related Issues',
  'Examination',
  'Infrastructure',
  'Classroom Maintenance',
  'Hostel',
  'Drinking Water',
  'Washroom and Sanitation',
  'Library',
  'Transportation',
  'Internet and Wi-Fi',
  'Administration',
  'Harassment and Misconduct',
  'Other',
] as const;

export const MAINTENANCE_CATEGORIES = [
  'Electrical',
  'Plumbing',
  'Classroom Maintenance',
  'Hostel Maintenance',
  'Furniture',
  'Water Supply',
  'Internet',
  'Other Infrastructure',
] as const;

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  ACTION_TAKEN: 'Action Taken',
  MANAGEMENT_VERIFICATION: 'Management Verification',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
  ESCALATED: 'Escalated',
  REOPENED: 'Reopened',
  AWAITING_STUDENT_RESPONSE: 'Awaiting Student Response',
};

export const LIFECYCLE_STAGES: ComplaintStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'ACTION_TAKEN',
  'RESOLVED',
  'CLOSED',
];
