import React from 'react';
import type { Ticket } from '../../store/useTicketStore';

interface SoldTableProps {
  tickets: Ticket[];
}

export const SoldTable: React.FC<SoldTableProps> = ({ tickets }) => {
  const soldTickets = tickets.filter((t: Ticket) => t.status === 'Sold');

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[0.9rem]">
        <thead>
          <tr className="border-b border-(--border-color) text-(--text-muted)">
            <th className="p-3 px-4">Mã vé</th>
            <th className="p-3 px-4">Loại vé</th>
            <th className="p-3 px-4">Khách hàng</th>
            <th className="p-3 px-4">Email / SĐT</th>
            <th className="p-3 px-4">Giá vé</th>
            <th className="p-3 px-4">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {soldTickets.length > 0 ? (
            soldTickets.map(t => (
              <tr key={t.id} className="border-b border-white/3">
                <td className="p-3 px-4 font-bold text-(--primary)">{t.id}</td>
                <td className="p-3 px-4">
                  <span className={`badge ${t.type === 'VIP' ? 'badge-holding' : t.type === 'GA' ? 'badge-available' : 'badge-sold'} text-[0.65rem]`}>
                    {t.type}
                  </span>
                </td>
                <td className="p-3 px-4 font-semibold">{t.heldBy}</td>
                <td className="p-3 px-4 text-(--text-secondary)">
                  {t.customerEmail || t.customerPhone || t.customerInfo ? (
                    <div>
                      <div>{t.customerEmail || t.customerInfo?.email || 'N/A'}</div>
                      <div className="text-[0.8rem] text-(--text-muted)">{t.customerPhone || t.customerInfo?.phone || 'N/A'}</div>
                    </div>
                  ) : (
                    <span className="text-(--text-muted)">Mô phỏng</span>
                  )}
                </td>
                <td className="p-3 px-4">{t.price.toLocaleString('vi-VN')} VNĐ</td>
                <td className="p-3 px-4">
                  <span className="badge badge-sold text-[0.65rem]">ĐÃ BÁN</span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="p-8 text-center text-(--text-muted)">
                Chưa có vé nào được bán thành công.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
