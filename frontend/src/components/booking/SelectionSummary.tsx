import React from 'react';
import { Ticket } from 'lucide-react';

interface SelectionSummaryProps {
  selectedSeats: string[];
  tempTotal: number;
  onHold: () => void;
  loading: boolean;
}

export const SelectionSummary: React.FC<SelectionSummaryProps> = ({
  selectedSeats,
  tempTotal,
  onHold,
  loading,
}) => {
  if (selectedSeats.length === 0) return null;

  return (
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
        onClick={onHold}
        className="btn btn-primary bg-emerald-500 hover:bg-emerald-400 text-black border-none py-2.5 px-6 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
        disabled={loading}
      >
        <Ticket size={14} /> {loading ? 'Đang giữ...' : 'Giữ các vé đã chọn'}
      </button>
    </div>
  );
};
