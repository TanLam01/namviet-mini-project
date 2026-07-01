import React from 'react';
import type { SeatButtonProps, TicketSeatGridProps } from '../../types';

const SeatButton = React.memo(({ id, status, isSelected, loading, onClick }: SeatButtonProps) => {
  let bgClass = 'bg-white/5';
  let borderClass = 'border-(--border-color)';
  let textClass = 'text-(--text-primary)';
  let disabled = false;

  if (isSelected) {
    bgClass = '!bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
    borderClass = 'border-emerald-400';
    textClass = 'text-black';
  } else if (status === 'Holding') {
    bgClass = 'bg-(--warning)';
    borderClass = 'border-(--warning)';
    textClass = 'text-black';
    disabled = true;
  } else if (status === 'Sold') {
    bgClass = 'bg-(--accent)';
    borderClass = 'border-(--accent)';
    textClass = 'text-white';
    disabled = true;
  }

  return (
    <button
      disabled={disabled || loading}
      onClick={() => onClick(id)}
      className={`border ${borderClass} ${bgClass} ${textClass} py-2 text-[0.75rem] font-bold rounded-md flex flex-col items-center transition-all duration-200 ${
        !disabled 
          ? (isSelected ? 'cursor-pointer scale-hover' : 'glass-card cursor-pointer scale-hover') 
          : 'cursor-not-allowed'
      }`}
      title={`Mã: ${id} - ${status === 'Available' ? 'Bấm để chọn/hủy chọn' : status}`}
    >
      <span>{id.split('-')[1]}</span>
    </button>
  );
});

SeatButton.displayName = 'SeatButton';



export const TicketSeatGrid = ({ 
  tickets, 
  selectedType, 
  loading, 
  selectedSeats = [], 
  handleSelectTicket 
}: TicketSeatGridProps) => {
  const filteredTickets = tickets.filter(t => t.type === selectedType);

  return (
    <div className="flex flex-col gap-6">
      {/* Visual Seat Map Instructions */}
      <div className="flex gap-6 text-[0.8rem] flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-[3px] bg-white/15 border border-(--border-color)"></div>
          <span className="text-(--text-secondary)">Trống</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-[3px] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          <span className="text-(--text-secondary)">Đang chọn (Chờ giữ)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-[3px] bg-(--warning)"></div>
          <span className="text-(--text-secondary)">Đang giữ (Khóa 5 phút)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-[3px] bg-(--accent)"></div>
          <span className="text-(--text-secondary)">Đã bán</span>
        </div>
      </div>

      {/* Grid of Seats */}
      <div>
        <h3 className="text-sm font-bold mb-3">Sơ đồ chọn vé {selectedType}:</h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(62px,1fr))] gap-2 max-h-95 overflow-y-auto pr-1 py-3">
          {filteredTickets.map(ticket => {
            const isSelected = selectedSeats.includes(ticket.id);
            return (
              <SeatButton
                key={ticket.id}
                id={ticket.id}
                status={ticket.status}
                isSelected={isSelected}
                loading={loading}
                onClick={handleSelectTicket}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
