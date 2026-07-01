import React, { createContext, useState, useEffect } from 'react';
import { API_BASE } from '../constants';

export interface AuthContextType {
  user: string | null;
  role: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; role: string }>;
  logout: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
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
          localStorage.setItem('ticketbox_user', data.user.fullName);
          localStorage.setItem('ticketbox_role', data.user.role);
          localStorage.setItem('ticketbox_email', data.user.email || '');
          localStorage.setItem('ticketbox_phone', data.user.phone || '');
        } else {
          // Cookie unauthorized or expired, check mock fallback
          const savedUser = localStorage.getItem('ticketbox_user');
          const savedRole = localStorage.getItem('ticketbox_role');
          if (savedUser && savedRole) {
            setUser(savedUser);
            setRole(savedRole);
          }
        }
      } catch {
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

  const login = async (username: string, password: string): Promise<{ success: boolean; role: string }> => {
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
        localStorage.setItem('ticketbox_user', data.user.fullName);
        localStorage.setItem('ticketbox_role', data.user.role);
        localStorage.setItem('ticketbox_email', data.user.email || '');
        localStorage.setItem('ticketbox_phone', data.user.phone || '');
        return { success: true, role: data.user.role };
      } else {
        let errorMsg = 'Đăng nhập thất bại!';
        try {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errData = await res.json();
            errorMsg = errData.error || errorMsg;
          } else {
            errorMsg = `Server error: ${res.status} ${res.statusText}`;
          }
        } catch {
          // ignore
        }
        throw new Error(errorMsg);
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
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#0a0b10] text-[#f8f9fa] font-sans">
        <div className="w-9 h-9 border-3 border-[rgba(157,78,221,0.1)] border-t-[#9d4edd] rounded-full animate-spin mb-4"></div>
        <span className="text-[0.85rem] text-[#adb5bd] font-semibold tracking-[0.5px]">
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


