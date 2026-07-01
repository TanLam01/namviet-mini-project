import React, { useState } from 'react';
import { useTickets } from '../hooks/useTickets';
import { StatCard } from '../components/admin/StatCard';
import { HoldingTable } from '../components/admin/HoldingTable';
import { SoldTable } from '../components/admin/SoldTable';
import { DollarSign, ShieldAlert, BadgePercent, CheckSquare, Users, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';

export const Admin = () => {
  const { 
    tickets, 
    getStats, 
    resetAllTickets, 
    simulationActive, 
    setSimulationActive,
    ticketsLoading
  } = useTickets();

  const [activeTab, setActiveTab] = useState('holding'); // holding, sold
  const stats = getStats();

  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn RESET toàn bộ hệ thống vé về trạng thái ban đầu? Giao dịch cũ sẽ bị xóa.')) {
      resetAllTickets();
    }
  };

  return (
    <div className="flex flex-col gap-8">
      
      {/* Title & Simulation Controls */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3 flex-wrap">
            DASHBOARD QUẢN TRỊ
            <span className="badge badge-holding text-[0.7rem] font-black py-1 px-3">
              Anh Trai Say Hi - Concert 2026
            </span>
          </h1>
          <p className="text-(--text-secondary) text-sm mt-1">Theo dõi tình trạng vé, doanh thu và kiểm soát luồng giao dịch đồng thời của concert <strong>"Anh Trai Say Hi"</strong></p>
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          {/* Simulator Button */}
          <button
            className="btn btn-secondary flex items-center gap-2 cursor-pointer"
            onClick={() => setSimulationActive(!simulationActive)}
            style={{ 
              borderColor: simulationActive ? 'var(--secondary)' : 'var(--border-color)',
              background: simulationActive ? 'rgba(6, 214, 160, 0.05)' : 'rgba(255,255,255,0.02)'
            }}
            title="Mô phỏng 5.000 người dùng liên tục F5 và mua vé đồng thời để kiểm tra Concurrency"
          >
            {simulationActive ? (
              <>
                <ToggleRight size={24} className="text-(--secondary)" />
                <span className="text-[0.85rem]">SIMULATOR: ĐANG CHẠY</span>
              </>
            ) : (
              <>
                <ToggleLeft size={24} className="text-(--text-muted)" />
                <span className="text-[0.85rem]">SIMULATOR: TẮT</span>
              </>
            )}
          </button>

          {/* Reset Button */}
          <button
            className="btn btn-secondary flex items-center gap-2 border border-[rgba(255,0,127,0.2)] text-(--accent) cursor-pointer"
            onClick={handleReset}
          >
            <RefreshCw size={16} />
            <span className="text-[0.85rem]">Reset hệ thống</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <StatCard 
          title="TỔNG DOANH THU" 
          value={`${stats.revenue.toLocaleString('vi-VN')} VNĐ`} 
          icon={DollarSign} 
          color="var(--secondary)" 
          backgroundColor="rgba(6, 214, 160, 0.1)" 
          loading={ticketsLoading && tickets.length === 0}
        />
        <StatCard 
          title="VÉ ĐÃ BÁN" 
          value={stats.sold} 
          subValue={`/ ${stats.total} vé`} 
          icon={BadgePercent} 
          color="var(--accent)" 
          backgroundColor="rgba(255, 0, 127, 0.1)" 
          loading={ticketsLoading && tickets.length === 0}
        />
        <StatCard 
          title="VÉ ĐANG BỊ KHÓA (HOLD)" 
          value={stats.holding} 
          subValue="vé" 
          icon={ShieldAlert} 
          color="var(--warning)" 
          backgroundColor="rgba(255, 183, 3, 0.1)" 
          loading={ticketsLoading && tickets.length === 0}
        />
        <StatCard 
          title="VÉ CÒN TRỐNG (KHO)" 
          value={stats.available} 
          subValue="vé" 
          icon={CheckSquare} 
          color="var(--primary)" 
          backgroundColor="rgba(157, 78, 221, 0.1)" 
          loading={ticketsLoading && tickets.length === 0}
        />
      </div>

      {/* Details Lists */}
      <div className="glass-card p-6">
        
        {/* Tabs Headers */}
        <div className="flex gap-4 border-b border-(--border-color) mb-6 pb-2">
          <button
            onClick={() => setActiveTab('holding')}
            className="bg-transparent border-none py-2 px-4 font-bold cursor-pointer flex items-center gap-1.5"
            style={{
              color: activeTab === 'holding' ? 'var(--warning)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'holding' ? '2px solid var(--warning)' : '2px solid transparent'
            }}
          >
            <ShieldAlert size={16} /> Vé Đang Giữ Tạm Thời ({tickets.filter(t => t.status === 'Holding').length})
          </button>
          
          <button
            onClick={() => setActiveTab('sold')}
            className="bg-transparent border-none py-2 px-4 font-bold cursor-pointer flex items-center gap-1.5"
            style={{
              color: activeTab === 'sold' ? 'var(--secondary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'sold' ? '2px solid var(--secondary)' : '2px solid transparent'
            }}
          >
            <Users size={16} /> Danh Sách Vé Đã Bán ({tickets.filter(t => t.status === 'Sold').length})
          </button>
        </div>

        {/* Tabs Contents */}
        {activeTab === 'holding' ? (
          <HoldingTable tickets={tickets} />
        ) : (
          <SoldTable tickets={tickets} />
        )}

      </div>

    </div>
  );
};
