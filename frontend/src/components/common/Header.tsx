import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Ticket, Home as HomeIcon, CalendarDays, ShieldAlert, LogOut, User, History } from 'lucide-react';

export const Header = ({ currentPage, onNavigate }) => {
  const { user, role, logout } = useAuth();

  return (
    <header className="header glass">
      <div className="nav-container">
        
        {/* Logo */}
        <div 
          className="logo-group cursor-pointer" 
          onClick={() => role === 'user' && onNavigate('home')}
        >
          <Ticket className="logo-icon" size={28} />
          <span>Ticket box</span>
        </div>

        {/* Navigation Links dynamically rendered based on role */}
        <nav className="nav-links">
          {role === 'user' && (
            <>
              <button 
                className={`nav-btn ${currentPage === 'home' ? 'active' : ''}`}
                onClick={() => onNavigate('home')}
              >
                <HomeIcon size={16} />
                <span>Sự kiện</span>
              </button>
              
              <button 
                className={`nav-btn ${currentPage === 'booking' ? 'active' : ''}`}
                onClick={() => onNavigate('booking')}
              >
                <CalendarDays size={16} />
                <span>Đặt vé</span>
              </button>

              <button 
                className={`nav-btn ${currentPage === 'history' ? 'active' : ''}`}
                onClick={() => onNavigate('history')}
              >
                <History size={16} />
                <span>Lịch sử vé</span>
              </button>
            </>
          )}

          {role === 'admin' && (
            <button className="nav-btn active cursor-default">
              <ShieldAlert size={16} />
              <span>Quản trị viên</span>
            </button>
          )}
        </nav>

        {/* User Greeting & Logout button */}
        <div className="flex items-center gap-4 text-sm">
          <div className="hidden sm:flex items-center gap-1.5 text-(--text-secondary) font-semibold">
            <User size={16} className="text-(--primary)" />
            <span>{user}</span>
          </div>

          <button 
            className="btn btn-secondary py-2 px-4 rounded-[20px] text-xs flex items-center gap-1.5 cursor-pointer border-red-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40"
            onClick={logout}
          >
            <LogOut size={14} />
            <span>Đăng xuất</span>
          </button>
        </div>

      </div>
    </header>
  );
};
