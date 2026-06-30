import React, { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TicketProvider } from './context/TicketContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Home } from './pages/Home';
import { Booking } from './pages/Booking';
import { Admin } from './pages/Admin';
import { History } from './pages/History';

function MainApp() {
  const { isAuthenticated, role } = useAuth();
  const [currentPage, setCurrentPage] = useState('home'); // home, booking, admin, register, login-admin

  // Auto-redirect based on role
  useEffect(() => {
    if (isAuthenticated) {
      if (role === 'admin') {
        setCurrentPage('admin');
      } else if (role === 'user' && (currentPage === 'admin' || currentPage === 'register' || currentPage === 'login-admin')) {
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
      return <Register onNavigate={setCurrentPage} />;
    }
    if (currentPage === 'login-admin') {
      return <Login isAdminMode={true} onNavigate={setCurrentPage} />;
    }
    return <Login isAdminMode={false} onNavigate={setCurrentPage} />;
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
        {renderPage()}
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
