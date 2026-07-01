import React, { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { TicketProvider } from './context/TicketProvider';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = React.lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const Home = React.lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Booking = React.lazy(() => import('./pages/Booking').then(m => ({ default: m.Booking })));
const Admin = React.lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const History = React.lazy(() => import('./pages/History').then(m => ({ default: m.History })));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh] w-full">
    <div className="skeleton py-3.5 px-12 rounded-[20px] text-sm text-(--text-muted) font-semibold animate-pulse">
      Đang tải trang...
    </div>
  </div>
);

function MainApp() {
  const { isAuthenticated, role } = useAuth();
  const [currentPage, setCurrentPage] = useState('home'); // home, booking, admin, register, login-admin

  // Auto-redirect based on role
  useEffect(() => {
    if (isAuthenticated) {
      if (role === 'admin') {
        setCurrentPage('admin');
      } else if (role === 'user' && (currentPage === 'admin' || currentPage === 'register' || currentPage === 'login-admin' || currentPage === 'login')) {
        setCurrentPage('home');
      }
    } else {
      // If user logs out, reset state to login if it was a protected page
      if (currentPage === 'home' || currentPage === 'booking' || currentPage === 'admin') {
        setCurrentPage('login');
      }
    }
  }, [role, isAuthenticated, currentPage]);

  if (!isAuthenticated) {
    if (currentPage === 'register') {
      return (
        <React.Suspense fallback={<PageLoader />}>
          <Register onNavigate={setCurrentPage} />
        </React.Suspense>
      );
    }
    if (currentPage === 'login-admin') {
      return (
        <React.Suspense fallback={<PageLoader />}>
          <Login isAdminMode={true} onNavigate={setCurrentPage} />
        </React.Suspense>
      );
    }
    return (
      <React.Suspense fallback={<PageLoader />}>
        <Login isAdminMode={false} onNavigate={setCurrentPage} />
      </React.Suspense>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return role === 'user' ? <Home onNavigate={setCurrentPage} /> : <Admin />;
      case 'booking':
        return role === 'user' ? <Booking /> : <Admin />;
      case 'history':
        return role === 'user' ? <History onNavigate={setCurrentPage} /> : <Admin />;
      case 'admin':
        return role === 'admin' ? <Admin /> : <Home onNavigate={setCurrentPage} />;
      default:
        return role === 'admin' ? <Admin /> : <Home onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="app-container">
      {/* Dynamic Header */}
      <Header currentPage={currentPage} onNavigate={setCurrentPage} />

      {/* Main Content Area */}
      <main className="main-content">
        <React.Suspense fallback={<PageLoader />}>
          {renderPage()}
        </React.Suspense>
      </main>

      {/* Reusable Footer */}
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TicketProvider>
          <MainApp />
        </TicketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
