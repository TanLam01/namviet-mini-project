export const TICKET_TYPES = {
  VIP: { name: 'Vé VIP (Hàng đầu)', price: 3000000, total: 50, color: '#ffb703' },
  GA: { name: 'Vé GA (Đứng gần sân khấu)', price: 1500000, total: 150, color: '#06d6a0' },
  STANDARD: { name: 'Vé Standard (Khán đài)', price: 800000, total: 300, color: '#9d4edd' }
};

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
