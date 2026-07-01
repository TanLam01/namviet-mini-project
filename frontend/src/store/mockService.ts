import { Ticket, CurrentUserHold } from '../types';
import { TICKET_TYPES } from '../constants';
import { queryClient } from '../queryClient';

export const getInitialTickets = (): Ticket[] => {
  try {
    const savedCache = localStorage.getItem('ticketbox_cached_tickets');
    if (savedCache) return JSON.parse(savedCache);
    
    const savedMock = localStorage.getItem('ticketbox_tickets_v3');
    if (savedMock) return JSON.parse(savedMock);
  } catch (err) {
    console.error("Failed to parse cached tickets:", err);
  }
  return [];
};

export const runHoldTicketsMock = (
  ticketIds: string[], 
  userName: string, 
  setStore: (state: any) => void
): Promise<void> => {
  const tickets = queryClient.getQueryData<Ticket[]>(['tickets']) || [];
  const sortedTicketIds = [...ticketIds].sort();

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const unavailable = sortedTicketIds.filter(id => {
        const t = tickets.find(item => item.id === id);
        return !t || t.status !== 'Available';
      });

      if (unavailable.length > 0) {
        reject(new Error(`Ghế ${unavailable.join(', ')} đã bị người khác chọn hoặc giữ mất rồi!`));
        return;
      }

      const next = [...tickets];
      const expiryTime = Date.now() + 5 * 60 * 1000;
      const heldTicketsInfo: Ticket[] = [];

      sortedTicketIds.forEach(id => {
        const index = next.findIndex(t => t.id === id);
        next[index] = {
          ...next[index],
          status: 'Holding',
          holdExpiry: expiryTime,
          heldBy: userName || 'Khách hàng Local'
        };
        heldTicketsInfo.push(next[index]);
      });

      const totalPrice = heldTicketsInfo.reduce((sum, t) => sum + t.price, 0);
      const hold: CurrentUserHold = {
        ticketIds: sortedTicketIds,
        expiryTime,
        tickets: heldTicketsInfo,
        totalPrice
      };

      setStore({ currentUserHold: hold });
      queryClient.setQueryData(['tickets'], next);
      localStorage.setItem('ticketbox_tickets_v3', JSON.stringify(next));
      resolve();
    }, 300);
  });
};

export const runReleaseHoldMock = (currentUserHold: CurrentUserHold) => {
  const tickets = queryClient.getQueryData<Ticket[]>(['tickets']) || [];
  const next = tickets.map(t => 
    currentUserHold.ticketIds.includes(t.id) 
      ? { ...t, status: 'Available', holdExpiry: null, heldBy: null }
      : t
  );
  queryClient.setQueryData(['tickets'], next);
  localStorage.setItem('ticketbox_tickets_v3', JSON.stringify(next));
};

export const runConfirmPaymentMock = (
  currentUserHold: CurrentUserHold,
  customerInfo: { fullName: string; email: string; phone: string },
  setStore: (state: any) => void
): Promise<void> => {
  const tickets = queryClient.getQueryData<Ticket[]>(['tickets']) || [];

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const next = [...tickets];
      const holdingList = currentUserHold.ticketIds.filter(id => {
        const t = tickets.find(item => item.id === id);
        return t && t.status === 'Holding';
      });

      if (holdingList.length !== currentUserHold.ticketIds.length) {
        reject(new Error('Thanh toán thất bại! Vé không còn được giữ.'));
        return;
      }

      currentUserHold.ticketIds.forEach(id => {
        const index = next.findIndex(t => t.id === id);
        next[index] = {
          ...next[index],
          status: 'Sold',
          holdExpiry: null,
          heldBy: customerInfo.fullName,
          customerName: customerInfo.fullName,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone,
          customerInfo
        };
      });

      setStore({ currentUserHold: null });
      queryClient.setQueryData(['tickets'], next);
      localStorage.setItem('ticketbox_tickets_v3', JSON.stringify(next));
      resolve();
    }, 500);
  });
};

export const runResetAllTicketsMock = (setStore: (state: any) => void) => {
  const initial: Ticket[] = [];
  for (let i = 1; i <= TICKET_TYPES.VIP.total; i++) {
    initial.push({ id: `VIP-${String(i).padStart(3, '0')}`, type: 'VIP', price: TICKET_TYPES.VIP.price, status: 'Available' });
  }
  for (let i = 1; i <= TICKET_TYPES.GA.total; i++) {
    initial.push({ id: `GA-${String(i).padStart(3, '0')}`, type: 'GA', price: TICKET_TYPES.GA.price, status: 'Available' });
  }
  for (let i = 1; i <= TICKET_TYPES.STANDARD.total; i++) {
    initial.push({ id: `STD-${String(i).padStart(3, '0')}`, type: 'STANDARD', price: TICKET_TYPES.STANDARD.price, status: 'Available' });
  }
  setStore({ currentUserHold: null });
  queryClient.setQueryData(['tickets'], initial);
  localStorage.setItem('ticketbox_tickets_v3', JSON.stringify(initial));
};

export const startCleanInterval = (getStore: () => any, setStore: (state: any) => void) => {
  if (!(window as any).ticketCleanInterval) {
    (window as any).ticketCleanInterval = setInterval(() => {
      const now = Date.now();
      const { isUsingBackend, currentUserHold } = getStore();
      const tickets = queryClient.getQueryData<Ticket[]>(['tickets']) || [];

      if (currentUserHold && now >= currentUserHold.expiryTime) {
        setStore({ currentUserHold: null });
      }

      if (!isUsingBackend && tickets.length > 0) {
        let changed = false;
        const next = tickets.map(t => {
          if (t.status === 'Holding' && t.holdExpiry && now >= t.holdExpiry) {
            changed = true;
            if (currentUserHold && currentUserHold.ticketIds.includes(t.id)) {
              setStore({ currentUserHold: null });
            }
            return { ...t, status: 'Available', holdExpiry: null, heldBy: null };
          }
          return t;
        });
        if (changed) {
          queryClient.setQueryData(['tickets'], next);
          localStorage.setItem('ticketbox_tickets_v3', JSON.stringify(next));
        }
      }
    }, 1000);
  }
};

export const startSimulationInterval = (getStore: () => any) => {
  if (!(window as any).ticketSimulateInterval) {
    (window as any).ticketSimulateInterval = setInterval(() => {
      const { isUsingBackend, simulationActive, currentUserHold } = getStore();
      const tickets = queryClient.getQueryData<Ticket[]>(['tickets']) || [];
      if (isUsingBackend || !simulationActive || tickets.length === 0) return;

      const next = [...tickets];
      const rand = Math.random();

      if (rand < 0.65) {
        const count = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < count; i++) {
          const pool = next.filter(t => t.status === 'Available');
          if (pool.length === 0) break;
          const target = pool[Math.floor(Math.random() * pool.length)];
          const index = next.findIndex(t => t.id === target.id);
          const buyerNames = ['Nguyễn Văn A', 'Trần Thị B', 'Lê Hoàng C', 'Phạm Minh D', 'Hoàng Anh E'];
          next[index] = {
            ...next[index],
            status: 'Holding',
            holdExpiry: Date.now() + (Math.floor(Math.random() * 2) + 1) * 60 * 1000,
            heldBy: buyerNames[Math.floor(Math.random() * buyerNames.length)] + ' (Simulated)'
          };
        }
      } else if (rand < 0.85) {
        const holding = next.filter(t => t.status === 'Holding' && (!currentUserHold || !currentUserHold.ticketIds.includes(t.id)));
        if (holding.length > 0) {
          const target = holding[Math.floor(Math.random() * holding.length)];
          const index = next.findIndex(t => t.id === target.id);
          next[index] = { ...next[index], status: 'Sold', holdExpiry: null };
        }
      } else {
        const holding = next.filter(t => t.status === 'Holding' && (!currentUserHold || !currentUserHold.ticketIds.includes(t.id)));
        if (holding.length > 0) {
          const target = holding[Math.floor(Math.random() * holding.length)];
          const index = next.findIndex(t => t.id === target.id);
          next[index] = { ...next[index], status: 'Available', holdExpiry: null, heldBy: null };
        }
      }
      queryClient.setQueryData(['tickets'], next);
      localStorage.setItem('ticketbox_tickets_v3', JSON.stringify(next));
    }, 4000);
  }
};
