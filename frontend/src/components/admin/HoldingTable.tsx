import React, { useState, useEffect } from 'react';
import type { Ticket, HoldingCountdownProps, HoldingTableProps } from '../../types';

const HoldingCountdown: React.FC<HoldingCountdownProps> = ({ expiryTime }) => {
  const targetTime = expiryTime ? (typeof expiryTime === 'string' ? new Date(expiryTime).getTime() : expiryTime) : 0;
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!targetTime) return 0;
    return Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!targetTime) return;

    const calculate = () => {
      const left = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0 && interval) {
        clearInterval(interval);
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  return (
    <span 
      className={`font-mono font-bold ${secondsLeft < 60 ? 'text-(--accent)' : 'text-(--warning)'}`}
    >
      {secondsLeft > 0 ? `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : 'Hết hạn'}
    </span>
  );
};


export const HoldingTable: React.FC<HoldingTableProps> = ({ tickets }) => {
  const holdingTickets = tickets.filter((t: Ticket) => t.status === 'Holding');

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[0.9rem]">
        <thead>
          <tr className="border-b border-(--border-color) text-(--text-muted)">
            <th className="p-3 px-4">Mã vé</th>
            <th className="p-3 px-4">Loại vé</th>
            <th className="p-3 px-4">Người giữ vé</th>
            <th className="p-3 px-4">Giá vé</th>
            <th className="p-3 px-4">Thời gian còn lại</th>
          </tr>
        </thead>
        <tbody>
          {holdingTickets.length > 0 ? (
            holdingTickets.map(t => (
              <tr key={t.id} className="border-b border-white/3">
                <td className="p-3 px-4 font-bold text-(--primary)">{t.id}</td>
                <td className="p-3 px-4">
                  <span className={`badge ${t.type === 'VIP' ? 'badge-holding' : t.type === 'GA' ? 'badge-available' : 'badge-sold'} text-[0.65rem]`}>
                    {t.type}
                  </span>
                </td>
                <td className="p-3 px-4 text-(--text-secondary)">{t.heldBy}</td>
                <td className="p-3 px-4">{t.price.toLocaleString('vi-VN')} VNĐ</td>
                <td className="p-3 px-4">
                  <HoldingCountdown expiryTime={t.holdExpiry} />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="p-8 text-center text-(--text-muted)">
                Hiện tại không có vé nào bị khóa tạm thời.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
