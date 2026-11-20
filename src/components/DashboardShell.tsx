import React, { useState } from 'react';
import {
  Bell,
  Building2,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  FileBarChart2,
  FileText,
  GraduationCap,
  HelpCircle,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PlusCircle,
  Search,
  Settings,
  User,
  UserCheck,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { BrandMark } from './GlassUI';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ROLE_SIDEBAR_ITEMS: Record<UserRole, SidebarNavItem[]> = {
  STUDENT: [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'submit', label: 'Submit Complaint', icon: PlusCircle },
    { id: 'my-complaints', label: 'My Complaints', icon: FileText },
    { id: 'track', label: 'Track Status', icon: Clock },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
  FACULTY: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assigned', label: 'Assigned Complaints', icon: ClipboardList },
    { id: 'in-progress', label: 'In Progress', icon: Clock },
    { id: 'resolved', label: 'Resolved', icon: CheckCheck },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Profile', icon: User },
  ],
  ADMIN: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'all-complaints', label: 'All Complaints', icon: ClipboardList },
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'faculty', label: 'Faculty', icon: Users },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'assignments', label: 'Complaint Assignments', icon: UserCheck },
    { id: 'analytics', label: 'Analytics', icon: FileBarChart2 },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
  MAINTENANCE: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assigned', label: 'Assigned Tasks', icon: Wrench },
    { id: 'in-progress', label: 'In Progress', icon: Clock },
    { id: 'completed', label: 'Completed Tasks', icon: CheckCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Profile', icon: User },
  ],
};

interface DashboardShellProps {
  activeSection: string;
  onSelectSection: (section: string) => void;
  globalSearch: string;
  onGlobalSearchChange: (val: string) => void;
  onNavigatePublic: (path: string) => void;
  children: React.ReactNode;
}

export function DashboardShell({
  activeSection,
  onSelectSection,
  globalSearch,
  onGlobalSearchChange,
  onNavigatePublic,
  children,
}: DashboardShellProps) {
  const {
    user,
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    logout,
  } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  if (!user) return null;

  const navItems = ROLE_SIDEBAR_ITEMS[user.role] || [];
  const defaultSection = navItems[0]?.id || 'dashboard';

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    onNavigatePublic('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Floating Bar */}
      <header className="sticky top-0 z-40 px-3 sm:px-6 pt-3 pb-2">
        <div className="max-w-[1520px] mx-auto glass-panel rounded-2xl px-4 sm:px-5 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#20242D] hover:bg-white/60 transition-colors"
              aria-label="Open navigation drawer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onSelectSection(defaultSection)}
              className="flex items-center gap-3 text-left whitespace-nowrap shrink-0"
            >
              <BrandMark size={32} />
              <span className="font-display font-bold text-base text-[#20242D] hidden sm:inline">
                Campus Portal
              </span>
            </button>
          </div>

          {/* Global Search */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="h-4 w-4 text-[#5A5E69] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={globalSearch}
                onChange={(e) => onGlobalSearchChange(e.target.value)}
                placeholder="Search complaints by ID, title, department..."
                className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-xs text-[#20242D] placeholder:text-[#6B707B]"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onSelectSection(defaultSection)}
              className="hidden xl:inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium text-[#292B32] hover:bg-white/60 transition-colors whitespace-nowrap"
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => onNavigatePublic('/contact')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#292B32] hover:bg-white/60 transition-colors whitespace-nowrap"
              title="Help & Support"
            >
              <HelpCircle className="h-4 w-4 text-[#5268A8]" />
              <span>Help</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((p) => !p);
                  setProfileOpen(false);
                }}
                className="relative p-2 rounded-xl hover:bg-white/60 text-[#20242D] transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#5268A8] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-panel-strong rounded-2xl p-4 z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-[#20242D]/10">
                    <span className="text-sm font-display font-bold text-[#20242D]">
                      Notifications ({unreadCount})
                    </span>
                    <button
                      type="button"
                      onClick={() => markAllNotificationsRead()}
                      className="text-xs font-semibold text-[#5268A8] hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#20242D]/8 mt-1">
                    {notifications.length === 0 ? (
                      <p className="py-6 text-center text-xs text-[#5A5E69]">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            if (!n.is_read) markNotificationRead(n.id);
                            setNotifOpen(false);
                            onSelectSection('notifications');
                          }}
                          className={`w-full text-left py-2.5 px-2 rounded-xl transition-colors hover:bg-white/60 ${
                            n.is_read ? 'opacity-70' : 'bg-white/40'
                          }`}
                        >
                          <p className="text-xs font-semibold text-[#20242D]">{n.title}</p>
                          <p className="text-[11px] text-[#4A4E59] mt-0.5 line-clamp-2">{n.message}</p>
                        </button>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen(false);
                      onSelectSection('notifications');
                    }}
                    className="w-full mt-2 pt-2 border-t border-[#20242D]/10 text-center text-xs font-semibold text-[#5268A8] hover:underline"
                  >
                    View Notification Centre
                  </button>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((p) => !p);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-white/50 hover:bg-white/75 border border-white/60 transition-colors"
              >
                <div className="h-7 w-7 rounded-lg bg-[#5268A8] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {user.full_name
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-[#20242D] leading-tight max-w-[130px] truncate">
                    {user.full_name}
                  </p>
                  <p className="text-[10px] text-[#5A5E69] leading-tight">{user.role}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-[#5A5E69]" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-60 glass-panel-strong rounded-2xl p-2 z-50">
                  <div className="px-3 py-2 border-b border-[#20242D]/10">
                    <p className="text-xs font-bold text-[#20242D] truncate">{user.full_name}</p>
                    <p className="text-[11px] text-[#5A5E69] truncate">{user.university_id} · {user.department}</p>
                  </div>
                  <div className="py-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        onSelectSection(user.role === 'ADMIN' ? 'settings' : 'profile');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#20242D] hover:bg-white/70 transition-colors"
                    >
                      <User className="h-3.5 w-3.5 text-[#5268A8]" />
                      <span>Account & Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        onNavigatePublic('/');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#20242D] hover:bg-white/70 transition-colors"
                    >
                      <Home className="h-3.5 w-3.5 text-[#5268A8]" />
                      <span>Portal Home</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        onNavigatePublic('/contact');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#20242D] hover:bg-white/70 transition-colors"
                    >
                      <HelpCircle className="h-3.5 w-3.5 text-[#5268A8]" />
                      <span>Contact Us</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#A63A3A] hover:bg-white/70 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <div className="flex-1 max-w-[1520px] w-full mx-auto px-3 sm:px-6 pb-8 pt-2 flex gap-5">
        {/* Desktop Floating Glass Sidebar */}
        <aside
          className={`hidden lg:flex flex-col shrink-0 glass-panel rounded-3xl p-3.5 h-[calc(100vh-104px)] sticky top-[82px] transition-all duration-200 ${
            collapsed ? 'w-[78px]' : 'w-[252px]'
          }`}
        >
          <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-[#20242D]/10">
            {!collapsed && (
              <span className="text-[11px] font-semibold tracking-wide text-[#5A5E69]">
                {user.role === 'ADMIN'
                  ? 'Management Console'
                  : user.role === 'FACULTY'
                  ? 'Faculty Workspace'
                  : user.role === 'MAINTENANCE'
                  ? 'Maintenance Desk'
                  : 'Student Workspace'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((p) => !p)}
              className="p-1.5 rounded-lg hover:bg-white/60 text-[#4A4E59] transition-colors ml-auto"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto pr-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectSection(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#5268A8] text-white shadow-sm'
                      : 'text-[#292B32] hover:bg-white/60'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && item.id === 'notifications' && unreadCount > 0 && (
                    <span
                      className={`ml-auto text-[11px] font-mono tabular-nums ${
                        isActive ? 'text-white/90' : 'text-[#5268A8]'
                      }`}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="pt-3 mt-2 border-t border-[#20242D]/10">
            <button
              type="button"
              onClick={handleLogout}
              title={collapsed ? 'Sign Out' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#A63A3A] hover:bg-white/60 transition-colors ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-[#20242D]/35 backdrop-blur-sm"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div className="relative w-72 max-w-[82vw] glass-panel-strong h-full p-5 flex flex-col z-10">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#20242D]/10">
                <div className="flex items-center gap-2.5">
                  <BrandMark size={30} />
                  <span className="font-display font-bold text-sm text-[#20242D]">Campus Portal</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/60"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectSection(item.id);
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        isActive ? 'bg-[#5268A8] text-white' : 'text-[#292B32] hover:bg-white/60'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 space-y-6">{children}</main>
      </div>
    </div>
  );
}
