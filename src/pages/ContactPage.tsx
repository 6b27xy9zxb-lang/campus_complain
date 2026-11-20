import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  LayoutDashboard,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { MAHI_AVATAR_IMAGE } from '../components/GlassUI';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface ContactPageProps {
  onNavigate: (path: string) => void;
}

const FAQS = [
  {
    q: 'How long does it take for University Management to review a new complaint?',
    a: 'All newly submitted complaints appear immediately in the University Management command queue. Critical infrastructure and sanitation complaints carry a 48-hour target resolution deadline.',
  },
  {
    q: 'Are anonymous complaints truly hidden from faculty members?',
    a: 'Yes. When you enable the Anonymous Complaint toggle, the backend strips your name, USN, and email from every API response served to faculty and maintenance personnel.',
  },
  {
    q: 'Can a faculty member close or dismiss a complaint tagged against them?',
    a: 'No. Faculty members can review complaints, respond with explanations, and upload supporting documents, but only University Management holds authority to mark a complaint Resolved or Closed.',
  },
  {
    q: 'How do I track an existing complaint without logging in?',
    a: 'Use the Track Complaint tool on the Home page with your generated Complaint Reference ID (such as CMP20261114001) to view real-time status stages and history.',
  },
];

export function ContactPage({ onNavigate }: ContactPageProps) {
  const { user, pushToast } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const dashboardPath =
    user?.role === 'ADMIN'
      ? '/dashboard/admin'
      : user?.role === 'FACULTY'
      ? '/dashboard/faculty'
      : user?.role === 'MAINTENANCE'
      ? '/dashboard/maintenance'
      : '/dashboard/student';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmittedSuccess(false);

    if (!fullName.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setFormError('Please complete all required fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (message.trim().length < 10) {
      setFormError('Please write a message of at least 10 characters.');
      return;
    }

    setSending(true);
    try {
      await apiRequest('/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      setSubmittedSuccess(true);
      setSubject('');
      setMessage('');
      pushToast({
        type: 'success',
        title: 'Message Sent',
        description: 'Your inquiry has been stored and routed to Campus Support.',
      });
    } catch (err: any) {
      setFormError(err.message || 'Unable to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      {/* Header Banner */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-[30px] p-7 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
      >
        <div>
          <p className="text-xs font-semibold text-[#5268A8]">Contact & Support</p>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#20242D] mt-1 text-balance">
            Let&apos;s Make Our Campus Better.
          </h1>
          <p className="text-sm sm:text-base text-[#4A4E59] mt-2.5 max-w-2xl">
            Have questions, suggestions or need assistance? Get in touch with our team.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {user && (
            <button
              type="button"
              onClick={() => onNavigate(dashboardPath)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5268A8] hover:bg-[#3F5289] text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Return to Dashboard</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/65 hover:bg-white/90 text-[#20242D] border border-white/75 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </button>
        </div>
      </motion.section>

      {/* Team Member Card + Contact Form */}
      <div className="grid lg:grid-cols-12 gap-7 items-start">
        {/* Profile Card + Help Information */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.18 }}
            className="glass-panel rounded-3xl p-7"
          >
            <p className="text-xs font-semibold text-[#5268A8] mb-5">Contact Person</p>
            <div className="flex items-center gap-5">
              <div className="h-24 w-24 rounded-2xl overflow-hidden border border-white/80 shadow-md shrink-0 bg-[#D8D3CA]">
                <img
                  src={MAHI_AVATAR_IMAGE}
                  alt="Mahi Talwani"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <h2 className="font-display font-bold text-2xl text-[#20242D] tracking-tight">
                  MAHI TALWANI
                </h2>
                <p className="font-mono text-sm font-semibold text-[#5268A8] mt-1">
                  ENG25CS0587
                </p>
                <p className="text-xs font-medium text-[#4A4E59] mt-1.5">
                  Project Team Member
                </p>
              </div>
            </div>
          </motion.div>

          <div className="glass-panel rounded-3xl p-7 space-y-4">
            <div className="flex items-center gap-2.5 text-[#20242D]">
              <ShieldCheck className="h-5 w-5 text-[#5268A8]" />
              <h3 className="font-display font-bold text-lg">Help & Portal Information</h3>
            </div>
            <p className="text-sm text-[#4A4E59] leading-relaxed">
              The Campus Complaint Management Portal provides a structured, auditable communication
              channel connecting students, faculty, maintenance teams, and university administration.
            </p>
            <div className="pt-2 space-y-2.5 text-xs text-[#3A3E48]">
              <p>
                <span className="font-semibold text-[#20242D]">Student Grievances:</span> Log in through Student Login to file academic, hostel, or infrastructure reports.
              </p>
              <p>
                <span className="font-semibold text-[#20242D]">Faculty Coordination:</span> Tagged faculty receive immediate workspace notifications and can post official explanations.
              </p>
              <p>
                <span className="font-semibold text-[#20242D]">General Suggestions:</span> Use the contact form to share portal feedback or request assistance.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7 glass-panel rounded-3xl p-7 sm:p-9">
          <h2 className="font-display font-bold text-2xl text-[#20242D]">Send a Message</h2>
          <p className="text-sm text-[#4A4E59] mt-1">
            All fields are validated and securely logged for review by our team.
          </p>

          {formError && (
            <div className="mt-5 rounded-2xl bg-[#A63A3A]/10 border border-[#A63A3A]/25 px-4 py-3 text-xs font-semibold text-[#A63A3A]">
              {formError}
            </div>
          )}

          {submittedSuccess && (
            <div className="mt-5 rounded-2xl bg-[#256D4F]/10 border border-[#256D4F]/25 px-4 py-3.5 flex items-center gap-3 text-xs font-semibold text-[#256D4F]">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
              <span>Thank you. Your message has been successfully submitted to the Campus Support team.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#292B32] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="w-full glass-input rounded-xl px-4 py-3 text-sm text-[#20242D]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#292B32] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  required
                  className="w-full glass-input rounded-xl px-4 py-3 text-sm text-[#20242D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292B32] mb-1.5">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="How can we assist you?"
                required
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-[#20242D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292B32] mb-1.5">
                Message
              </label>
              <textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your question, feedback, or support request..."
                required
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-[#20242D] resize-y"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#5268A8] hover:bg-[#3F5289] text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                <span>{sending ? 'Sending Message...' : 'Send Message'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <section className="glass-panel rounded-3xl p-7 sm:p-9">
        <div className="flex items-center gap-2.5 mb-6">
          <HelpCircle className="h-5 w-5 text-[#5268A8]" />
          <h2 className="font-display font-bold text-2xl text-[#20242D]">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="divide-y divide-[#20242D]/10">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={faq.q} className="py-4 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 text-left"
                >
                  <span className="font-display font-semibold text-sm sm:text-base text-[#20242D]">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-[#5268A8] shrink-0 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-2.5 text-sm text-[#4A4E59] leading-relaxed max-w-4xl">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
