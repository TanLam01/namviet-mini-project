import React from 'react';
import { CreditCard, User, Mail, Phone } from 'lucide-react';

interface CheckoutFormProps {
  userName: string;
  setUserName: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  phone: string;
  setPhone: (phone: string) => void;
  disabled: boolean;
  loading: boolean;
  isFormValid: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const CheckoutForm: React.FC<CheckoutFormProps> = ({
  userName,
  setUserName,
  email,
  setEmail,
  phone,
  setPhone,
  disabled,
  loading,
  isFormValid,
  onSubmit,
}) => {
  return (
    <div className="glass-card p-6">
      <h3 className="text-[1.1rem] font-bold mb-5 flex items-center gap-2">
        <CreditCard size={18} className="logo-icon" /> THÔNG TIN THANH TOÁN
      </h3>

      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label className="form-label mb-1.5" htmlFor="fullName">Họ và tên *</label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
            <input
              id="fullName"
              className="form-input pl-10"
              type="text"
              placeholder="Nguyễn Văn A"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={disabled || loading}
              autoComplete="name"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label mb-1.5" htmlFor="email">Địa chỉ Email *</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
            <input
              id="email"
              className="form-input pl-10"
              type="email"
              placeholder="nguyenvana@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={disabled || loading}
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label mb-1.5" htmlFor="phone">Số điện thoại *</label>
          <div className="relative">
            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
            <input
              id="phone"
              className="form-input pl-10"
              type="tel"
              placeholder="0901234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={disabled || loading}
              autoComplete="tel"
              required
            />
          </div>
        </div>

        <button
          className="btn btn-primary w-full mt-4 py-3.5 cursor-pointer font-bold"
          type="submit"
          disabled={disabled || !isFormValid || loading}
        >
          {loading ? 'Đang thanh toán...' : 'Thanh toán ngay'}
        </button>
      </form>
    </div>
  );
};
