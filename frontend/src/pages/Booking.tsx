import React, { useState, useEffect } from 'react';
import { useTickets } from '../context/TicketContext';
import { TicketSeatGrid } from '../components/booking/TicketSeatGrid';
import { TicketReceipt } from '../components/booking/TicketReceipt';
import { CountdownTimer } from '../components/booking/CountdownTimer';
import { AlertCircle, Clock, CreditCard, User, Mail, Phone, Ticket } from 'lucide-react';

export const Booking = () => {
  const { 
    tickets, 
    currentUserHold, 
    holdTickets, 
    releaseCurrentHold, 
    confirmPayment 
  } = useTickets();

  // Load profile defaults from logged in user if available
  const [userName, setUserName] = useState(() => localStorage.getItem('ticketbox_user') || '');
  const [email, setEmail] = useState(() => localStorage.getItem('ticketbox_email') || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('ticketbox_phone') || '');
  
  const [selectedType, setSelectedType] = useState('VIP'); // VIP, GA, STANDARD
  const [selectedSeats, setSelectedSeats] = useState([]); // Temporary selection in client
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [lastBookedTicket, setLastBookedTicket] = useState(null);

  // Auto-sync form if user logs in/updates later
  useEffect(() => {
    const savedUser = localStorage.getItem('ticketbox_user');
    const savedEmail = localStorage.getItem('ticketbox_email');
    const savedPhone = localStorage.getItem('ticketbox_phone');
    if (savedUser) setUserName(savedUser);
    if (savedEmail) setEmail(savedEmail);
    if (savedPhone) setPhone(savedPhone);
  }, []);

  // Form validation
  const isFormValid = userName.trim() !== '' && email.trim() !== '' && phone.trim() !== '';

  const handleSelectTicket = (ticketId) => {
    if (currentUserHold) return; // Cannot select other seats while holding

    setSelectedSeats(prev => {
      let next;
      if (prev.includes(ticketId)) {
        next = prev.filter(id => id !== ticketId); // Toggle selection off
      } else {
        if (prev.length >= 5) {
          setError('Bạn chỉ được đặt tối đa 5 vé trong một lượt giao dịch!');
          return prev;
        }
        setError('');
        next = [...prev, ticketId]; // Toggle selection on
      }
      return [...next].sort(); // Sắp xếp thứ tự bảng chữ cái để tránh bị nhảy vị trí (flicker)
    });
  };

  const tempTotal = React.useMemo(() => {
    return selectedSeats.reduce((sum, id) => {
      const t = tickets.find(ticket => ticket.id === id);
      return sum + (t ? t.price : 0);
    }, 0);
  }, [selectedSeats, tickets]);

  const availableCounts = React.useMemo(() => {
    const counts: Record<string, number> = { VIP: 0, GA: 0, STANDARD: 0 };
    tickets.forEach(t => {
      if (t.status === 'Available' && counts[t.type] !== undefined) {
        counts[t.type]++;
      }
    });
    return counts;
  }, [tickets]);

  const handleHoldSelectedSeats = async () => {
    if (selectedSeats.length === 0) return;

    setLoading(true);
    setError('');

    try {
      await holdTickets(selectedSeats, userName || 'Khách hàng');
      setSelectedSeats([]); // Clear client-side selection
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!currentUserHold) return;
    if (!isFormValid) {
      setError('Vui lòng nhập đầy đủ thông tin thanh toán!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const customerInfo = {
        fullName: userName,
        email,
        phone
      };
      
      const ticketIds = currentUserHold.ticketIds;
      const totalPrice = currentUserHold.totalPrice;
      const heldTickets = currentUserHold.tickets;

      // Add a client-side idempotency key for payment request!
      const idempotencyKey = `pay-${ticketIds.join('-')}-${Date.now()}`;

      const res = await fetch(`http://localhost:8080/api/tickets/pay`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        credentials: 'include',
        body: JSON.stringify({
          ticketIds,
          fullName: customerInfo.fullName,
          email: customerInfo.email,
          phone: customerInfo.phone
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Thanh toán thất bại!');
      }

      // Successful confirmation
      await confirmPayment(customerInfo);
      
      setLastBookedTicket({
        tickets: heldTickets,
        totalPrice: totalPrice,
        buyer: customerInfo
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelHold = async () => {
    setLoading(true);
    await releaseCurrentHold();
    setLoading(false);
  };

  const handleTimerExpired = async () => {
    setError('Thời gian giữ vé 5 phút đã hết. Vé của bạn đã được trả về sơ đồ để người khác chọn!');
    await releaseCurrentHold();
  };

  // Success receipt view
  if (success && lastBookedTicket) {
    return (
      <TicketReceipt 
        ticket={lastBookedTicket} 
        onReset={() => { setSuccess(false); setLastBookedTicket(null); }} 
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold">ĐẶT VÉ SỰ KIỆN</h1>
        <p className="text-(--text-secondary) text-sm">
          {currentUserHold 
            ? 'Vui lòng hoàn tất thông tin thanh toán trong thời gian giữ vé.' 
            : 'Chọn các vị trí ghế trống (tối đa 5 vé) dưới sơ đồ để tiến hành đặt.'}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-[rgba(255,0,127,0.1)] border border-[rgba(255,0,127,0.3)] text-(--accent) p-4 rounded-sm text-[0.9rem]">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid-main-booking">
        {/* Left Area: Grid or Hold summary */}
        {/* We keep the grid container always mounted to prevent DOM reconstruction flicker when switching back */}
        <div className={`glass-card p-6 flex flex-col gap-6 ${currentUserHold ? 'hidden' : ''}`}>
          {/* Type selector tab */}
          <div className="flex gap-3 border-b border-(--border-color) pb-4 flex-wrap">
            {['VIP', 'GA', 'STANDARD'].map(type => (
              <button
                key={type}
                className={`btn ${selectedType === type ? 'btn-primary' : 'btn-secondary'} rounded-[20px] py-2 px-5 text-[0.85rem] cursor-pointer`}
                onClick={() => setSelectedType(type)}
              >
                {type} ({availableCounts[type] || 0} trống)
              </button>
            ))}
          </div>

          {/* Sơ đồ chọn ghế */}
          <TicketSeatGrid
            tickets={tickets}
            selectedType={selectedType}
            loading={loading}
            selectedSeats={selectedSeats}
            handleSelectTicket={handleSelectTicket}
          />

          {/* Floating Selection summary */}
          {selectedSeats.length > 0 && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-fadeIn">
              <div>
                <p className="text-sm font-bold text-emerald-400">
                  Đang chọn {selectedSeats.length} ghế: {selectedSeats.join(', ')}
                </p>
                <p className="text-xs text-(--text-secondary)">
                  Tạm tính: <strong>{tempTotal.toLocaleString('vi-VN')} VNĐ</strong>
                </p>
              </div>
              <button 
                onClick={handleHoldSelectedSeats}
                className="btn btn-primary bg-emerald-500 hover:bg-emerald-400 text-black border-none py-2.5 px-6 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                disabled={loading}
              >
                <Ticket size={14} /> {loading ? 'Đang giữ...' : 'Giữ các vé đã chọn'}
              </button>
            </div>
          )}
          
          {loading && selectedSeats.length > 0 && (
            <div className="text-center p-4 text-(--text-secondary)">
              <span className="skeleton py-2 px-8 inline-block">Đang khóa vị trí ghế trên máy chủ...</span>
            </div>
          )}
        </div>

        {currentUserHold && (
          <div className="glass-card p-8 flex flex-col gap-6 border border-(--border-color-active) animate-fadeIn">
            <div className="flex items-center gap-3 text-(--secondary)">
              <AlertCircle size={28} />
              <div>
                <h3 className="text-xl font-extrabold">Đã giữ vé thành công!</h3>
                <p className="text-(--text-secondary) text-sm">Các ghế đã được khóa tạm thời cho bạn.</p>
              </div>
            </div>

            <div className="p-5 bg-black/20 rounded-sm border border-(--border-color)">
              <div className="flex justify-between mb-3 border-b border-white/5 pb-2">
                <span className="text-(--text-secondary)">Mã ghế giữ ({currentUserHold.ticketIds.length} vé):</span>
                <strong className="text-(--primary) text-base break-words text-right max-w-[60%]">
                  {currentUserHold.ticketIds.join(', ')}
                </strong>
              </div>
              <div className="flex justify-between mb-3">
                <span className="text-(--text-secondary)">Hạng vé:</span>
                <strong className="font-bold">{currentUserHold.tickets[0]?.type}</strong>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/5">
                <span className="text-(--text-secondary)">Tổng số tiền:</span>
                <strong className="text-(--secondary) font-black text-xl">
                  {currentUserHold.totalPrice.toLocaleString('vi-VN')} VNĐ
                </strong>
              </div>
            </div>

            <button 
              className="btn btn-secondary self-start cursor-pointer font-bold" 
              onClick={handleCancelHold} 
              disabled={loading}
            >
              Hủy chọn vé này
            </button>
          </div>
        )}

        {/* Right Area: Timer & Checkout Form */}
        <div className="flex flex-col gap-6">
          
          {/* Timer component */}
          {currentUserHold ? (
            <CountdownTimer 
              expiryTime={currentUserHold.expiryTime} 
              onExpire={handleTimerExpired} 
            />
          ) : (
            <div className="glass-card p-6 text-(--text-muted) flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Clock size={20} />
                <span className="text-[0.85rem] font-bold">CHƯA CÓ VÉ NÀO ĐƯỢC GIỮ</span>
              </div>
              <p className="text-xs leading-relaxed">
                Đồng hồ đếm ngược 5 phút sẽ bắt đầu chạy ngay khi bạn nhấp giữ các vé đã chọn.
              </p>
            </div>
          )}

          {/* Checkout Form */}
          <div className="glass-card p-6">
            <h3 className="text-[1.1rem] font-bold mb-5 flex items-center gap-2">
              <CreditCard size={18} className="logo-icon" /> THÔNG TIN THANH TOÁN
            </h3>

            <form onSubmit={handlePaymentSubmit}>
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
                    disabled={!currentUserHold || loading}
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
                    disabled={!currentUserHold || loading}
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
                    disabled={!currentUserHold || loading}
                    required
                  />
                </div>
              </div>

              <button
                className="btn btn-primary w-full mt-4 py-3.5 cursor-pointer font-bold"
                type="submit"
                disabled={!currentUserHold || !isFormValid || loading}
              >
                {loading ? 'Đang thanh toán...' : 'Thanh toán ngay'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};
