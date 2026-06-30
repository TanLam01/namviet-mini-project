import React from 'react';
import { useTickets } from '../context/TicketContext';
import { Calendar, MapPin, Music, Ticket, ArrowRight, ShieldCheck, Flame } from 'lucide-react';

export const Home = ({ onNavigate }) => {
  const { getStats, ticketTypes, tickets, ticketsLoading } = useTickets() as any;
  const stats = getStats();

  const activities = React.useMemo(() => {
    return tickets
      .filter((t: any) => t.status !== 'Available')
      .map((t: any) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        user: t.heldBy || 'Khách hàng ẩn danh',
        action: t.status === 'Sold' ? 'đã mua thành công' : 'đang giữ vé'
      }))
      .slice(-5)
      .reverse();
  }, [tickets]);

  const ticketStatsByType = React.useMemo(() => {
    const statsMap: Record<string, { sold: number; holding: number; available: number }> = {
      VIP: { sold: 0, holding: 0, available: 0 },
      GA: { sold: 0, holding: 0, available: 0 },
      STANDARD: { sold: 0, holding: 0, available: 0 }
    };

    tickets.forEach((t: any) => {
      const type = t.type;
      if (statsMap[type]) {
        if (t.status === 'Sold') statsMap[type].sold++;
        else if (t.status === 'Holding') statsMap[type].holding++;
      }
    });

    const defaultTotals = { VIP: 50, GA: 150, STANDARD: 300 };
    Object.keys(statsMap).forEach((type) => {
      const total = ticketTypes[type]?.total || defaultTotals[type as keyof typeof defaultTotals];
      statsMap[type].available = total - statsMap[type].sold - statsMap[type].holding;
    });

    return statsMap;
  }, [tickets, ticketTypes]);

  return (
    <div className="flex flex-col gap-10">
      
      {/* Banner Section */}
      <section 
        className="relative py-12 px-8 rounded-lg overflow-hidden flex flex-col gap-6 border border-[rgba(157,78,221,0.2)] bg-cover bg-center"
        style={{ 
          backgroundImage: 'linear-gradient(to right, rgba(10, 11, 16, 0.95), rgba(157, 78, 221, 0.15)), url("https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000&auto=format&fit=crop")'
        }}
      >
        <div className="flex gap-2 items-center">
          <span className="badge badge-holding animate-pulse">
            <Flame size={12} /> Tải cực cao - Vé bán giới hạn
          </span>
        </div>
        
        <div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-4 bg-linear-to-r from-white to-(--primary) bg-clip-text text-transparent">
            Anh Trai Say Hi
          </h1>
          <p className="text-(--text-secondary) text-lg max-w-150">
            Đêm nhạc Live Concert bùng nổ nhất mùa hè này với dàn Line-up đình đám. Vé mở bán giới hạn chỉ 500 vị trí duy nhất trong hệ thống.
          </p>
        </div>

        {/* Concert Info Grid */}
        <div className="flex flex-wrap gap-6 text-[0.95rem] text-(--text-primary) mt-2">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="logo-icon" />
            <span>20:00, Thứ Bảy - Ngày 15/08/2026</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-(--secondary)" />
            <span>Sân vận động Quân khu 7, TP. Hồ Chí Minh</span>
          </div>
          <div className="flex items-center gap-2">
            <Music size={18} className="text-(--accent)" />
            <span>Pop / Rock / Electronic Live</span>
          </div>
        </div>

        <div className="mt-4">
          <button 
            className="btn btn-primary py-3.5 px-8 rounded-[30px] text-base cursor-pointer font-bold" 
            onClick={() => onNavigate('booking')}
            disabled={ticketsLoading || stats.available === 0}
          >
            {ticketsLoading ? (
              'Đang kiểm tra kho vé...'
            ) : stats.available > 0 ? (
              <>Đặt vé ngay <ArrowRight size={18} /></>
            ) : (
              'HẾT VÉ / SOLD OUT'
            )}
          </button>
        </div>
      </section>

      {/* Real-time Ticket Status */}
      <section>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-extrabold">TÌNH TRẠNG KHO VÉ (REAL-TIME)</h2>
            <p className="text-(--text-secondary) text-sm">Số lượng vé thay đổi liên tục theo các giao dịch đồng thời</p>
          </div>
          <span className="text-[0.85rem] text-(--text-muted) flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-(--secondary) animate-pulse"></span>
            Cập nhật tự động
          </span>
        </div>

        <div className="grid-3">
          {Object.entries(ticketTypes as Record<string, any>).map(([key, info]) => {
            const totalInType = info.total;
            const { sold: soldInType, holding: holdingInType, available: availableInType } = ticketStatsByType[key] || { sold: 0, holding: 0, available: 0 };
            
            const availablePercent = (availableInType / totalInType) * 100;
            const holdingPercent = (holdingInType / totalInType) * 100;
            const soldPercent = (soldInType / totalInType) * 100;

            return (
              <div key={key} className="glass-card p-6 relative overflow-hidden">
                {/* Visual Accent Top Line */}
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: info.color }}></div>
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-[1.1rem] font-bold">{key} Ticket</h3>
                    <p className="text-(--text-muted) text-[0.8rem]">{info.name}</p>
                  </div>
                  <span className="text-xl font-extrabold" style={{ color: info.color }}>
                    {info.price.toLocaleString('vi-VN')}đ
                  </span>
                </div>

                {/* Progress Bar visual indicator */}
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex mb-4">
                  <div style={{ width: `${soldPercent}%` }} className="bg-(--accent) transition-[width] duration-500" title="Đã bán"></div>
                  <div style={{ width: `${holdingPercent}%` }} className="bg-(--warning) transition-[width] duration-500" title="Đang giữ"></div>
                  <div style={{ width: `${availablePercent}%` }} className="bg-(--secondary) transition-[width] duration-500" title="Còn trống"></div>
                </div>

                <div className="flex justify-between text-[0.85rem]">
                  <div>
                    <span className="text-(--secondary)">Trống: </span>
                    <strong className="text-base">{availableInType}</strong>
                  </div>
                  <div>
                    <span className="text-(--warning)">Đang giữ: </span>
                    <strong>{holdingInType}</strong>
                  </div>
                  <div>
                    <span className="text-(--accent)">Đã bán: </span>
                    <strong>{soldInType}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Live Activity & Features */}
      <div className="grid-2">
        {/* Real-time activity ticker */}
        <section className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Ticket size={18} className="logo-icon" /> hoạt động giao dịch gần đây
          </h3>
          <div className="flex flex-col gap-3 min-h-50">
            {ticketsLoading && activities.length === 0 ? (
              <div className="flex flex-col gap-3">
                <div className="h-10 w-full bg-white/5 animate-pulse rounded-sm border-l-3 border-white/10"></div>
                <div className="h-10 w-full bg-white/5 animate-pulse rounded-sm border-l-3 border-white/10"></div>
                <div className="h-10 w-full bg-white/5 animate-pulse rounded-sm border-l-3 border-white/10"></div>
              </div>
            ) : activities.length > 0 ? (
              activities.map((act, index) => (
                <div 
                  key={`${act.id}-${index}`} 
                  className="flex justify-between items-center py-2.5 px-3 bg-white/2 rounded-r-sm text-[0.85rem]"
                  style={{ borderLeft: `3px solid ${act.status === 'Sold' ? 'var(--accent)' : 'var(--warning)'}` }}
                >
                  <div>
                    <span className="text-(--text-muted)">Mã vé:</span> <strong className="text-(--text-primary)">{act.id}</strong>
                    <span className="text-(--text-secondary) ml-2">{act.user} {act.action}</span>
                  </div>
                  <span className={`badge ${act.status === 'Sold' ? 'badge-sold' : 'badge-holding'}`}>
                    {act.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-(--text-muted) gap-2">
                <ShieldCheck size={32} className="opacity-30" />
                <span>Chưa có giao dịch phát sinh. Đang chờ phiên bán bắt đầu!</span>
              </div>
            )}
          </div>
        </section>

        {/* Technical Highlights box */}
        <section className="glass-card p-6 flex flex-col gap-4 border border-(--secondary)/15">
          <h3 className="text-lg font-bold flex items-center gap-2 text-(--secondary)">
            <ShieldCheck size={20} /> BẢO VỆ GIAO DỊCH AN TOÀN
          </h3>
          <p className="text-(--text-secondary) text-sm leading-relaxed">
            Hệ thống Ticket box được trang bị cơ chế chống quá tải và ngăn chặn Race Condition tối tân:
          </p>
          <ul className="list-disc pl-5 text-[0.85rem] text-(--text-secondary) flex flex-col gap-2">
            <li><strong>Chặn Spam Click:</strong> Vô hiệu hóa nút nhấn và hiển thị trạng thái chờ trong suốt quá trình xử lý giao dịch.</li>
            <li><strong>Giữ Vé Độc Quyền:</strong> Vé được giữ 5 phút ngay khi bấm chọn, đảm bảo không có người thứ hai chọn trùng vị trí.</li>
            <li><strong>Race-Condition Guard:</strong> BE tối ưu hóa xử lý concurrency, tự động nhả vé nếu không thanh toán sau 5 phút.</li>
          </ul>
        </section>
      </div>

    </div>
  );
};
