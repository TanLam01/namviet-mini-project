import React, { useState, useEffect } from 'react';
import { useTickets } from '../hooks/useTickets';
import { TicketSeatGrid } from '../components/booking/TicketSeatGrid';
import { TicketReceipt } from '../components/booking/TicketReceipt';
import { CountdownTimer } from '../components/booking/CountdownTimer';
import { CheckoutForm } from '../components/booking/CheckoutForm';
import { HoldSummary } from '../components/booking/HoldSummary';
import { SelectionSummary } from '../components/booking/SelectionSummary';
import { AlertCircle, Clock } from 'lucide-react';
import { API_BASE } from '../constants';

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
  const [idempotencyKey, setIdempotencyKey] = useState('');

  // Auto-sync form if user logs in/updates later
  useEffect(() => {
    const savedUser = localStorage.getItem('ticketbox_user');
    const savedEmail = localStorage.getItem('ticketbox_email');
    const savedPhone = localStorage.getItem('ticketbox_phone');
    if (savedUser) setUserName(savedUser);
    if (savedEmail) setEmail(savedEmail);
    if (savedPhone) setPhone(savedPhone);
  }, []);

  // Stabilize idempotencyKey per hold session
  useEffect(() => {
    if (currentUserHold && currentUserHold.ticketIds) {
      setIdempotencyKey(prev => {
        const prefix = `pay-${currentUserHold.ticketIds.sort().join('-')}`;
        if (prev && prev.startsWith(prefix)) return prev;
        return `${prefix}-${Date.now()}`;
      });
    } else {
      setIdempotencyKey('');
    }
  }, [currentUserHold]);

  // Form validation with email and phone formats
  const isFormValid = React.useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^0\d{9}$/;
    return userName.trim() !== '' && emailRegex.test(email) && phoneRegex.test(phone);
  }, [userName, email, phone]);

  const handleSelectTicket = React.useCallback((ticketId) => {
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
  }, [currentUserHold]);

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
      const activeIdempotencyKey = idempotencyKey || `pay-${ticketIds.join('-')}-${Date.now()}`;

      const res = await fetch(`${API_BASE}/api/tickets/pay`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Idempotency-Key': activeIdempotencyKey
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
        let errorMsg = 'Thanh toán thất bại!';
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
        <h1 className="text-3xl font-extrabold pb-1">ĐẶT VÉ SỰ KIỆN</h1>
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
        <div className={`glass-card p-6 flex flex-col gap-6 ${currentUserHold ? 'hidden' : ''}`}>
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
          <SelectionSummary
            selectedSeats={selectedSeats}
            tempTotal={tempTotal}
            onHold={handleHoldSelectedSeats}
            loading={loading}
          />
          
          {loading && selectedSeats.length > 0 && (
            <div className="text-center p-4 text-(--text-secondary)">
              <span className="skeleton py-2 px-8 inline-block">Đang khóa vị trí ghế trên máy chủ...</span>
            </div>
          )}
        </div>

        {currentUserHold && (
          <HoldSummary
            currentUserHold={currentUserHold}
            onCancel={handleCancelHold}
            loading={loading}
          />
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

          <CheckoutForm
            userName={userName}
            setUserName={setUserName}
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
            disabled={!currentUserHold}
            loading={loading}
            isFormValid={isFormValid}
            onSubmit={handlePaymentSubmit}
          />

        </div>
      </div>
    </div>
  );
};
