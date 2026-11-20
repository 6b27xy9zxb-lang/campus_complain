import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LiquidBackground, ToastViewport } from './components/GlassUI';
import { PublicLayout } from './components/PublicLayout';
import { LandingPage } from './pages/LandingPage';
import { AuthPages } from './pages/AuthPages';
import { ContactPage } from './pages/ContactPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { FacultyDashboard } from './pages/FacultyDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { MaintenanceDashboard } from './pages/MaintenanceDashboard';

function PortalRouter() {
  const { user, loading } = useAuth();
  const [path, setPath] = useState<string>(() => window.location.pathname || '/');
  const [searchQuery, setSearchQuery] = useState<string>(() => window.location.search || '');

  const navigate = useCallback((nextFullUrl: string) => {
    const [nextPath, nextSearch] = nextFullUrl.split('?');
    const normalized = nextPath || '/';
    window.history.pushState({}, '', nextFullUrl);
    setPath(normalized);
    setSearchQuery(nextSearch ? `?${nextSearch}` : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPop = () => {
      setPath(window.location.pathname || '/');
      setSearchQuery(window.location.search || '');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Scroll to About section if /about
  useEffect(() => {
    if (path === '/about') {
      setTimeout(() => {
        document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    }
  }, [path]);

  // Role-based route protection for dashboard paths
  const isDashboardRoute = path.startsWith('/dashboard');

  if (loading && isDashboardRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-panel rounded-2xl px-8 py-6 text-sm font-semibold text-[#20242D]">
          Verifying campus session...
        </div>
      </div>
    );
  }

  if (isDashboardRoute) {
    if (!user) {
      return (
        <PublicLayout currentPath="/login" onNavigate={navigate}>
          <AuthPages mode="selection" onNavigate={navigate} />
        </PublicLayout>
      );
    }

    // Strict RBAC route enforcement: redirect mismatched roles to their rightful dashboard
    if (path.startsWith('/dashboard/student')) {
      if (user.role !== 'STUDENT') {
        const correct =
          user.role === 'FACULTY'
            ? '/dashboard/faculty'
            : user.role === 'ADMIN'
            ? '/dashboard/admin'
            : '/dashboard/maintenance';
        navigate(correct);
        return null;
      }
      const tab = new URLSearchParams(searchQuery).get('tab') || undefined;
      return <StudentDashboard onNavigatePublic={navigate} initialTab={tab} />;
    }

    if (path.startsWith('/dashboard/faculty')) {
      if (user.role !== 'FACULTY') {
        const correct =
          user.role === 'STUDENT'
            ? '/dashboard/student'
            : user.role === 'ADMIN'
            ? '/dashboard/admin'
            : '/dashboard/maintenance';
        navigate(correct);
        return null;
      }
      return <FacultyDashboard onNavigatePublic={navigate} />;
    }

    if (path.startsWith('/dashboard/admin')) {
      if (user.role !== 'ADMIN') {
        const correct =
          user.role === 'STUDENT'
            ? '/dashboard/student'
            : user.role === 'FACULTY'
            ? '/dashboard/faculty'
            : '/dashboard/maintenance';
        navigate(correct);
        return null;
      }
      return <AdminDashboard onNavigatePublic={navigate} />;
    }

    if (path.startsWith('/dashboard/maintenance')) {
      if (user.role !== 'MAINTENANCE') {
        const correct =
          user.role === 'STUDENT'
            ? '/dashboard/student'
            : user.role === 'FACULTY'
            ? '/dashboard/faculty'
            : '/dashboard/admin';
        navigate(correct);
        return null;
      }
      return <MaintenanceDashboard onNavigatePublic={navigate} />;
    }

    // Generic /dashboard redirects by user role
    if (user.role === 'ADMIN') return <AdminDashboard onNavigatePublic={navigate} />;
    if (user.role === 'FACULTY') return <FacultyDashboard onNavigatePublic={navigate} />;
    if (user.role === 'MAINTENANCE') return <MaintenanceDashboard onNavigatePublic={navigate} />;
    return <StudentDashboard onNavigatePublic={navigate} />;
  }

  // Public Routes
  let content: React.ReactNode;
  if (path === '/login') {
    content = <AuthPages mode="selection" onNavigate={navigate} />;
  } else if (path === '/student-login') {
    content = <AuthPages mode="student" onNavigate={navigate} />;
  } else if (path === '/faculty-login') {
    content = <AuthPages mode="faculty" onNavigate={navigate} />;
  } else if (path === '/staff-login') {
    content = <AuthPages mode="staff" onNavigate={navigate} />;
  } else if (path === '/contact') {
    content = <ContactPage onNavigate={navigate} />;
  } else if (path === '/about') {
    content = <LandingPage onNavigate={navigate} initialSection="about" />;
  } else {
    content = <LandingPage onNavigate={navigate} />;
  }

  return (
    <PublicLayout currentPath={path} onNavigate={navigate}>
      {content}
    </PublicLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LiquidBackground />
      <PortalRouter />
      <ToastViewport />
    </AuthProvider>
  );
}
