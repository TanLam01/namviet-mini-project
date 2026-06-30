import React from 'react';
import { useTickets } from '../context/TicketContext';
import { useAuth } from '../context/AuthContext';
import { Ticket, QrCode, Calendar, MapPin, Receipt } from 'lucide-react';

export const History = ({ onNavigate }) => {
  const { tickets } = useTickets();
  const { user } = useAuth();

  // Filter tickets belonging to the current user
  const myTickets = tickets.filter(t => 
    t.status === 'Sold' && 
    (t.customerName === user || t.heldBy === user)
  );

  if (myTickets.length === 0) {
    return (
      <div className="max-w-150 my-10 mx-auto text-center">
        <div className="glass-card p-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-(--text-muted) mb-2">
            <Ticket size={32} />
          </div>
          <h2 className="text-2xl font-bold">Chưa có giao dịch nào</h2>
          <p className="text-(--text-secondary) text-sm max-w-100">
            Bạn chưa thực hiện giao dịch mua vé nào trên tài khoản này. Hãy chọn vị trí yêu thích của bạn ngay hôm nay!
          </p>
          <button 
            className="btn btn-primary mt-4 py-2.5 px-6 rounded-[20px] text-sm font-semibold cursor-pointer"
            onClick={() => onNavigate('booking')}
          >
            Đến trang đặt vé
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-200 mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold flex items-center gap-2">
          <Receipt className="text-(--secondary)" /> LỊCH SỬ MUA VÉ
        </h1>
        <p className="text-(--text-secondary) text-sm">
          Danh sách các vé bạn đã đặt và thanh toán thành công cho concert "Anh Trai Say Hi".
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {myTickets.map((t, idx) => (
          <div 
            key={t.id}
            className="bg-black/30 border border-dashed border-white/15 rounded-md pt-5 px-5 pb-7 text-left flex flex-col gap-3 relative overflow-hidden shrink-0"
          >
            {/* Ticket Cutout Circles */}
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-(--bg-base)"></div>
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-(--bg-base)"></div>

            <div className="flex justify-between items-start">
              <div>
                <span className="badge badge-sold text-[0.65rem] px-2 py-0.5 uppercase">VÉ ĐÃ THANH TOÁN</span>
                <h4 className="text-lg font-extrabold mt-1">Anh Trai Say Hi</h4>
              </div>
              <QrCode size={20} className="text-(--primary) opacity-80" />
            </div>

            {/* Concert Details */}
            <div className="text-[0.7rem] text-(--text-muted) flex flex-col gap-1 border-b border-white/5 pb-2">
              <span className="flex items-center gap-1"><Calendar size={12} /> 20:00, 15/08/2026</span>
              <span className="flex items-center gap-1"><MapPin size={12} /> Sân vận động Quân khu 7, TP. HCM</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-(--text-muted)">Mã ghế:</span>
                <p className="font-black text-(--primary) text-base">{t.id}</p>
              </div>
              <div>
                <span className="text-(--text-muted)">Hạng vé:</span>
                <p className="font-bold">{t.type}</p>
              </div>
              <div>
                <span className="text-(--text-muted)">Khách hàng:</span>
                <p className="font-semibold text-(--text-primary)">{t.customerName || t.heldBy || user}</p>
              </div>
              <div>
                <span className="text-(--text-muted)">Giá vé:</span>
                <p className="font-bold text-(--secondary)">{t.price.toLocaleString('vi-VN')} VNĐ</p>
              </div>
            </div>

            {/* Fake Barcode */}
            <div className="mt-4 flex flex-col items-center gap-1.5">
              <div className="h-8 w-[80%] bg-[repeating-linear-gradient(90deg,#fff,#fff_2px,#000_2px,#000_5px)]"></div>
              <span className="text-[0.65rem] tracking-widest text-(--text-muted) uppercase">MNT-{t.id}-2026</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
