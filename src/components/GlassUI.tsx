import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  ShieldAlert,
  X,
} from 'lucide-react';
import { LIFECYCLE_STAGES, STATUS_LABELS, type ComplaintPriority, type ComplaintStatus } from '../types';
import { useAuth } from '../context/AuthContext';

export const CAMPUS_BG_IMAGE = '/src/assets/images/campus_glass_bg_1795163120282.jpg';
export const CAMPUS_HERO_IMAGE = '/src/assets/images/campus_atrium_hero_1795163119957.jpg';
export const UNIVERSITY_CREST_IMAGE = '/src/assets/images/university_crest_1795163118837.jpg';
export const MAHI_AVATAR_IMAGE = '/src/assets/images/avatar_mahi_1795163119712.jpg';

export function LiquidBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#E8E4DD]" aria-hidden="true">
      <img
        src={CAMPUS_BG_IMAGE}
        alt=""
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover scale-105 blur-[12px] opacity-55"
      />
      {/* Warm beige & soft lavender atmospheric depth layers */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, rgba(232,228,221,0.78) 0%, rgba(232,228,221,0.58) 48%, rgba(183,180,216,0.28) 100%)',
        }}
      />
      <div
        className="absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full opacity-30 blur-[90px]"
        style={{ background: 'radial-gradient(circle, rgba(82,104,168,0.28) 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-32 -left-24 h-[460px] w-[460px] rounded-full opacity-35 blur-[90px]"
        style={{ background: 'radial-gradient(circle, rgba(183,180,216,0.45) 0%, transparent 70%)' }}
      />
    </div>
  );
}

export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl border border-white/60 bg-white/70 shadow-sm flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <img
        src={UNIVERSITY_CREST_IMAGE}
        alt="University Crest"
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

export function StatusIndicator({ status }: { status: ComplaintStatus | string }) {
  const label = STATUS_LABELS[status as ComplaintStatus] || status.replace(/_/g, ' ');
  let colorClass = 'text-[#292B32]';
  let Icon = Clock;

  switch (status) {
    case 'RESOLVED':
    case 'CLOSED':
      colorClass = 'text-[#256D4F]';
      Icon = CheckCircle2;
      break;
    case 'IN_PROGRESS':
    case 'ACTION_TAKEN':
    case 'MANAGEMENT_VERIFICATION':
      colorClass = 'text-[#5268A8]';
      Icon = Clock;
      break;
    case 'ESCALATED':
    case 'REJECTED':
      colorClass = 'text-[#A63A3A]';
      Icon = ShieldAlert;
      break;
    case 'UNDER_REVIEW':
    case 'ASSIGNED':
    case 'AWAITING_STUDENT_RESPONSE':
    case 'REOPENED':
      colorClass = 'text-[#9C631E]';
      Icon = AlertCircle;
      break;
    default:
      colorClass = 'text-[#4A4E59]';
      Icon = Clock;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${colorClass}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  );
}

export function PriorityIndicator({ priority }: { priority: ComplaintPriority | string }) {
  let colorClass = 'text-[#4A4E59]';
  let Icon = Info;
  if (priority === 'Critical') {
    colorClass = 'text-[#A63A3A]';
    Icon = AlertTriangle;
  } else if (priority === 'High') {
    colorClass = 'text-[#9C631E]';
    Icon = AlertCircle;
  } else if (priority === 'Medium') {
    colorClass = 'text-[#5268A8]';
    Icon = Info;
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${colorClass}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{priority}</span>
    </span>
  );
}

export function LifecycleTimeline({ currentStatus }: { currentStatus: ComplaintStatus | string }) {
  const normalizedIdx = (() => {
    if (currentStatus === 'MANAGEMENT_VERIFICATION') return 4;
    if (currentStatus === 'REOPENED' || currentStatus === 'AWAITING_STUDENT_RESPONSE') return 3;
    const idx = LIFECYCLE_STAGES.indexOf(currentStatus as ComplaintStatus);
    return idx >= 0 ? idx : 0;
  })();

  const isExceptional = ['REJECTED', 'ESCALATED'].includes(currentStatus);

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {LIFECYCLE_STAGES.map((stage, idx) => {
          const isCompleted = !isExceptional && idx < normalizedIdx;
          const isCurrent = !isExceptional && idx === normalizedIdx;

          return (
            <div
              key={stage}
              className={`rounded-xl px-3 py-2.5 border transition-colors ${
                isCurrent
                  ? 'bg-[#5268A8] text-white border-[#5268A8] shadow-sm'
                  : isCompleted
                  ? 'bg-white/65 text-[#256D4F] border-white/75'
                  : 'bg-white/25 text-[#5A5E69] border-white/40'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums mb-1 opacity-80">
                <span>0{idx + 1}</span>
                {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-[#256D4F]" />}
              </div>
              <div className="text-xs font-semibold leading-tight truncate">
                {STATUS_LABELS[stage]}
              </div>
            </div>
          );
        })}
      </div>
      {isExceptional && (
        <div className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-[#A63A3A]">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>Current State: {STATUS_LABELS[currentStatus as ComplaintStatus] || currentStatus}</span>
        </div>
      )}
    </div>
  );
}

export function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 450;
    const initial = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(initial + (value - initial) * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span className="tabular-nums font-display">
      {display}
      {suffix}
    </span>
  );
}

export function ToastViewport() {
  const { toasts, dismissToast } = useAuth();

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto glass-panel-strong rounded-2xl p-4 flex items-start gap-3"
          >
            <div className="mt-0.5 shrink-0">
              {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-[#256D4F]" />}
              {t.type === 'error' && <AlertTriangle className="h-5 w-5 text-[#A63A3A]" />}
              {t.type === 'info' && <Info className="h-5 w-5 text-[#5268A8]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#20242D]">{t.title}</p>
              {t.description && <p className="text-xs text-[#4A4E59] mt-0.5 leading-relaxed">{t.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="text-[#5A5E69] hover:text-[#20242D] p-1 rounded-lg transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
