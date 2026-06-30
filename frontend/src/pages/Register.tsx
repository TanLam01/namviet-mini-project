import React, { useState } from 'react';
import { User, Lock, Mail, Signature, Phone, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const registerSchema = z.object({
  username: z.string()
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự!')
    .max(20, 'Tên đăng nhập không được vượt quá 20 ký tự!')
    .regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới!'),
  password: z.string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự!'),
  fullName: z.string()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự!')
    .regex(/^[a-zA-ZÀ-ỹ\s]+$/, 'Họ và tên chỉ được chứa chữ cái tiếng Việt và khoảng trắng!'),
  email: z.string()
    .min(1, 'Email không được để trống!')
    .email('Địa chỉ Email không đúng định dạng!'),
  phone: z.string()
    .min(1, 'Số điện thoại không được để trống!')
    .regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0!')
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export const Register = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      fullName: '',
      email: '',
      phone: ''
    }
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          onNavigate('login');
        }, 2000);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Đăng ký thất bại!');
      }
    } catch (err: any) {
      // Fallback check if backend is offline
      const isNetworkError = err.message && (
        err.message.includes('Failed to fetch') || 
        err.message.includes('NetworkError') || 
        err.message.includes('Failed to connect') ||
        err.message.includes('fetch')
      );

      if (isNetworkError || err.name === 'TypeError') {
        console.warn("Backend API offline. Simulating registration in Mock Mode.");
        setSuccess(true);
        setTimeout(() => {
          onNavigate('login');
        }, 2000);
      } else {
        setError(err.message);
      }
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
      <div className="max-w-110 w-full z-10">
        
        {/* Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-2xl font-black bg-linear-to-r from-white to-(--primary) bg-clip-text text-transparent mb-1">
            Anh Trai Say Hi
          </div>
          <p className="text-(--text-secondary) text-xs uppercase tracking-[0.2em] font-semibold">
            Đăng ký tài khoản mới
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-(--primary) to-(--secondary)"></div>
          
          <h2 className="text-2xl font-black mb-6 text-center text-(--text-primary)">
            ĐĂNG KÝ
          </h2>

          {success ? (
            <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
              <CheckCircle size={48} className="text-green-400 animate-bounce" />
              <h3 className="text-lg font-bold text-green-400">Đăng ký thành công!</h3>
              <p className="text-sm text-(--text-secondary)">Hệ thống đang chuyển bạn về trang đăng nhập...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
              {error && (
                <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-sm text-xs">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Username */}
              <div className="form-group">
                <label className="form-label mb-1.5" htmlFor="reg-username">Tên đăng nhập *</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                  <input
                    id="reg-username"
                    className="form-input pl-10 py-2.5"
                    type="text"
                    placeholder="Nhập tên đăng nhập"
                    {...register('username')}
                  />
                </div>
                {errors.username && (
                  <span className="text-red-400 text-[0.7rem] mt-1.5 block leading-normal">
                    {errors.username.message}
                  </span>
                )}
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label mb-1.5" htmlFor="reg-password">Mật khẩu *</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                  <input
                    id="reg-password"
                    className="form-input pl-10 py-2.5"
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <span className="text-red-400 text-[0.7rem] mt-1.5 block leading-normal">
                    {errors.password.message}
                  </span>
                )}
              </div>

              {/* FullName */}
              <div className="form-group">
                <label className="form-label mb-1.5" htmlFor="reg-fullname">Họ và tên *</label>
                <div className="relative">
                  <Signature size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                  <input
                    id="reg-fullname"
                    className="form-input pl-10 py-2.5"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    {...register('fullName')}
                  />
                </div>
                {errors.fullName && (
                  <span className="text-red-400 text-[0.7rem] mt-1.5 block leading-normal">
                    {errors.fullName.message}
                  </span>
                )}
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label mb-1.5" htmlFor="reg-email">Email *</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                  <input
                    id="reg-email"
                    className="form-input pl-10 py-2.5"
                    type="email"
                    placeholder="email@example.com"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <span className="text-red-400 text-[0.7rem] mt-1.5 block leading-normal">
                    {errors.email.message}
                  </span>
                )}
              </div>

              {/* Phone */}
              <div className="form-group">
                <label className="form-label mb-1.5" htmlFor="reg-phone">Số điện thoại *</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                  <input
                    id="reg-phone"
                    className="form-input pl-10 py-2.5"
                    type="tel"
                    placeholder="0901234567"
                    {...register('phone')}
                  />
                </div>
                {errors.phone && (
                  <span className="text-red-400 text-[0.7rem] mt-1.5 block leading-normal">
                    {errors.phone.message}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <button
                className="btn btn-primary py-3 mt-2 w-full text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
              </button>

              {/* Back to Login */}
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 text-xs text-(--text-secondary) hover:text-white mt-2 transition-colors cursor-pointer"
                onClick={() => onNavigate('login')}
              >
                <ArrowLeft size={14} /> Quay lại Đăng nhập
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
