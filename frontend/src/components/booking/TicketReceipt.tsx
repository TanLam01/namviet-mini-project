import React from 'react';
import { CheckCircle, QrCode } from 'lucide-react';

export const TicketReceipt = ({ ticket, onReset }) => {
  return (
    <div className="max-w-160 my-8 mx-auto flex flex-col gap-6">
      <div className="glass-card p-8 text-center relative border-2 border-(--secondary)">
        <CheckCircle size={56} className="text-(--secondary) mb-4 mx-auto" />
        
        <h2 className="text-3xl font-extrabold mb-1">ĐẶT VÉ THÀNH CÔNG!</h2>
        <p className="text-(--text-secondary) text-sm mb-6">
          Cảm ơn bạn đã mua vé. Dưới đây là thông tin chi tiết ({ticket.tickets.length} vé) của bạn.
        </p>

        {/* Stack of Concert Tickets */}
        <div className="flex flex-col gap-5 max-h-120 overflow-y-auto pr-1">
          {ticket.tickets.map((t: any, idx: any) => (
            <div 
              key={t.id}
              className="bg-black/30 border border-dashed border-white/15 rounded-md pt-5 px-5 pb-7 text-left flex flex-col gap-3 relative overflow-hidden shrink-0"
            >
              {/* Ticket Cutout Circles */}
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-(--bg-base)"></div>
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-(--bg-base)"></div>

              <div className="flex justify-between items-start">
                <div>
                  <span className="badge badge-holding text-[0.65rem] px-2 py-0.5">VÉ SỐ #{idx + 1}</span>
                  <h4 className="text-lg font-extrabold mt-0.5">Anh Trai Say Hi</h4>
                </div>
                <QrCode size={20} className="text-(--primary) opacity-80" />
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
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
                  <p className="font-semibold text-(--text-primary)">{ticket.buyer.fullName}</p>
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

        {/* Invoice Summary */}
        <div className="mt-6 p-4 bg-black/40 border border-white/5 rounded-md text-left flex justify-between items-center text-sm">
          <div>
            <span className="text-(--text-muted) text-xs">Tổng tiền giao dịch:</span>
            <p className="text-xs text-(--text-secondary)">{ticket.buyer.email} | {ticket.buyer.phone}</p>
          </div>
          <strong className="text-xl text-(--secondary) font-black">
            {ticket.totalPrice.toLocaleString('vi-VN')} VNĐ
          </strong>
        </div>

        <button 
          className="btn btn-primary mt-6 w-full cursor-pointer py-3.5 font-bold" 
          onClick={onReset}
        >
          Mua thêm vé khác
        </button>
      </div>
    </div>
  );
};
