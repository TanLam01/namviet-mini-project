import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';

export const Login = ({ isAdminMode = false, onNavigate }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear fields and errors when switching modes
  useEffect(() => {
    setUsername('');
    setPassword('');
    setError('');
  }, [isAdminMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(username, password);
      // Validate that the role matches the login mode
      if (isAdminMode && res.role !== 'admin') {
        throw new Error('Tài khoản này không có quyền quản trị viên!');
      }
      if (!isAdminMode && res.role === 'admin') {
        throw new Error('Tài khoản admin vui lòng đăng nhập qua cổng Admin!');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center relative"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(157, 78, 221, 0.15) 0%, rgba(10, 11, 16, 1) 100%), url("https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop")'
      }}
    >
      {/* Decorative Blur Background elements */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-(--primary) opacity-10 filter blur-[80px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-(--secondary) opacity-10 filter blur-[80px] animate-pulse"></div>

      <div className="max-w-105 w-full z-10">
        
        {/* Brand/Concert Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-2xl font-black bg-gradient-to-r from-white to-(--primary) bg-clip-text text-transparent mb-2">
            Anh Trai Say Hi
          </div>
          <p className="text-(--text-secondary) text-xs uppercase tracking-[0.2em] font-semibold">
            Hệ thống đặt vé Concert
          </p>
        </div>

        {/* Glassmorphic Form Card */}
        <div className="glass-card p-8 border border-white/10 relative overflow-hidden">
          <div 
            className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${
              isAdminMode ? 'from-red-500 to-amber-500' : 'from-(--primary) to-(--secondary)'
            }`}
          ></div>
          
          <h2 className="text-2xl font-black mb-1 text-center text-(--text-primary)">
            ĐĂNG NHẬP
          </h2>
          <p className="text-xs text-center text-(--text-muted) mb-6 uppercase tracking-wider font-semibold">
            {isAdminMode ? 'CỔNG QUẢN TRỊ VIÊN' : 'CỔNG KHÁCH HÀNG'}
          </p>

          {error && (
            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-sm text-xs mb-5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Username field */}
            <div className="form-group mb-1">
              <label className="form-label mb-2" htmlFor="username">Tên đăng nhập</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                <input
                  id="username"
                  className="form-input pl-10"
                  type="text"
                  placeholder={isAdminMode ? 'admin' : 'Tên tài khoản hoặc email'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <div className="form-group mb-2">
              <label className="form-label mb-2" htmlFor="password">Mật khẩu</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                <input
                  id="password"
                  className="form-input pl-10"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              className={`btn ${isAdminMode ? 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 border-none' : 'btn-primary'} py-3.5 mt-2 w-full text-sm font-bold flex items-center justify-center gap-2 cursor-pointer text-white`}
              type="submit"
              disabled={loading}
            >
              {loading ? (
                'Đang xác thực...'
              ) : (
                <>
                  Đăng nhập <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Dynamic Helper Links */}
          <div className="mt-6 pt-5 border-t border-white/5 flex flex-col gap-3 text-xs text-center">
            
            {!isAdminMode ? (
              <>
                <div className="text-(--text-muted)">
                  Chưa có tài khoản?{' '}
                  <button 
                    onClick={() => onNavigate('register')}
                    className="text-(--secondary) font-bold hover:underline cursor-pointer bg-transparent border-none p-0 inline"
                  >
                    Đăng ký ngay
                  </button>
                </div>
                
                <button 
                  onClick={() => onNavigate('login-admin')}
                  className="text-amber-400 font-semibold hover:underline flex items-center justify-center gap-1 cursor-pointer bg-transparent border-none mx-auto"
                >
                  <ShieldCheck size={14} /> Đăng nhập dưới tài khoản admin
                </button>
              </>
            ) : (
              <button 
                onClick={() => onNavigate('login')}
                className="text-(--secondary) font-semibold hover:underline flex items-center justify-center gap-1 cursor-pointer bg-transparent border-none mx-auto"
              >
                <ArrowRight size={14} className="rotate-180" /> Quay lại cổng Khách hàng
              </button>
            )}

          </div>

          {/* Quick Help box */}
          <div className="mt-6 pt-5 border-t border-white/5 text-[0.72rem] text-(--text-muted) flex flex-col gap-1.5">
            <span className="font-bold flex items-center gap-1 text-(--text-secondary)">
              <HelpCircle size={13} className="text-(--primary)" /> Gợi ý tài khoản mẫu:
            </span>
            <div className="flex justify-between text-[0.7rem]">
              {isAdminMode ? (
                <span>Admin: <strong className="text-(--text-secondary)">admin / admin123</strong></span>
              ) : (
                <span>User: <strong className="text-(--text-secondary)">user / user123</strong></span>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
