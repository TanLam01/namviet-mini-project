import React from 'react';
import { AlertCircle } from 'lucide-react';

interface HoldSummaryProps {
  currentUserHold: {
    ticketIds: string[];
    tickets: Array<{ type: string }>;
    totalPrice: number;
  };
  onCancel: () => void;
  loading: boolean;
}

export const HoldSummary: React.FC<HoldSummaryProps> = ({
  currentUserHold,
  onCancel,
  loading,
}) => {
  return (
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
          <strong className="text-(--primary) text-base wrap-break-word text-right max-w-[60%]">
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
        onClick={onCancel} 
        disabled={loading}
      >
        Hủy chọn vé này
      </button>
    </div>
  );
};
