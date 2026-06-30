import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext<any>(null);
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null); // 'admin' or 'user'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user.fullName);
          setRole(data.user.role);
        } else {
          // Cookie unauthorized or expired, check mock fallback
          const savedUser = localStorage.getItem('ticketbox_user');
          const savedRole = localStorage.getItem('ticketbox_role');
          if (savedUser && savedRole) {
            setUser(savedUser);
            setRole(savedRole);
          }
        }
      } catch (err) {
        console.warn("Auth check failed, checking mock session fallback...");
        const savedUser = localStorage.getItem('ticketbox_user');
        const savedRole = localStorage.getItem('ticketbox_role');
        if (savedUser && savedRole) {
          setUser(savedUser);
          setRole(savedRole);
        }
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (username, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user.fullName);
        setRole(data.user.role);
        // Clear local storage to avoid leaking credentials outside HttpOnly cookies
        localStorage.removeItem('ticketbox_user');
        localStorage.removeItem('ticketbox_role');
        localStorage.removeItem('ticketbox_email');
        localStorage.removeItem('ticketbox_phone');
        return { success: true, role: data.user.role };
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Đăng nhập thất bại!');
      }
    } catch (err: any) {
      // Check if it's a network error (backend offline)
      const isNetworkError = err.message && (
        err.message.includes('Failed to fetch') || 
        err.message.includes('NetworkError') || 
        err.message.includes('Failed to connect') ||
        err.message.includes('fetch')
      );

      if (isNetworkError || err.name === 'TypeError') {
        console.warn("Backend API offline. Authenticating via local mock accounts.");
        if (username === 'admin' && password === 'admin123') {
          setUser('Administrator');
          setRole('admin');
          localStorage.setItem('ticketbox_user', 'Administrator');
          localStorage.setItem('ticketbox_role', 'admin');
          return { success: true, role: 'admin' };
        } else if (username === 'user' && password === 'user123') {
          setUser('Khách hàng Thân thiết');
          setRole('user');
          localStorage.setItem('ticketbox_user', 'Khách hàng Thân thiết');
          localStorage.setItem('ticketbox_role', 'user');
          return { success: true, role: 'user' };
        } else {
          throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác!');
        }
      } else {
        throw err;
      }
    }
  };

  const logout = async () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem('ticketbox_user');
    localStorage.removeItem('ticketbox_role');
    localStorage.removeItem('ticketbox_email');
    localStorage.removeItem('ticketbox_phone');

    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
    } catch (err) {
      console.warn("Failed to notify backend of logout:", err);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#0a0b10',
        color: '#f8f9fa',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid rgba(157, 78, 221, 0.1)',
          borderTop: '3px solid #9d4edd',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '16px'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <span style={{ fontSize: '0.85rem', color: '#adb5bd', fontWeight: 600, letterSpacing: '0.5px' }}>
          Đang xác thực phiên làm việc...
        </span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      role,
      isAuthenticated: !!user,
      login,
      logout,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
