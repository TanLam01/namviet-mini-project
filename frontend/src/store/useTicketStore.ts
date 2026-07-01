import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { queryClient } from '../queryClient';
import { TICKET_TYPES, API_BASE } from '../constants';
import type { Ticket, TicketStoreState } from '../types';
import * as mockService from './mockService';

export const useTicketStore = create<TicketStoreState>()(
  persist(
    (set, get) => ({
      // --- STATE ---
      currentUserHold: null,
      isUsingBackend: false, // Được tự động khôi phục bởi Zustand Persist Middleware từ localStorage
      simulationActive: true,
      ticketTypes: TICKET_TYPES,

      // --- SYSTEM INITIALIZATION ---
      initConnection: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/tickets/stats`, { credentials: 'include' });
          if (res.ok) {
            set({ isUsingBackend: true });
            console.log("Connected successfully to Golang Backend API.");

            // Hydration check for backend hold session expiry
            const hold = get().currentUserHold;
            if (hold && hold.expiryTime <= Date.now()) {
              set({ currentUserHold: null });
            }
            
            // Invalidate query to trigger background revalidation
            queryClient.invalidateQueries({ queryKey: ['tickets'] });

            // Establish SSE connection
            if ((window as any).eventSourceInstance) {
              (window as any).eventSourceInstance.close();
            }
            const es = new EventSource(`${API_BASE}/api/tickets/sse`);
            (window as any).eventSourceInstance = es;

            es.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data);
                if (data.action) {
                  if (data.action === 'reset') {
                    queryClient.invalidateQueries({ queryKey: ['tickets'] });
                    return;
                  }

                  queryClient.setQueryData(['tickets'], (oldTickets: any) => {
                    if (!oldTickets) return [];
                    return oldTickets.map((t: any) => {
                      if (t.id === data.ticketId) {
                        if (data.action === 'held') {
                          return {
                            ...t,
                            status: 'Holding',
                            heldBy: data.heldBy,
                            holdExpiry: data.expiry
                          };
                        } else if (data.action === 'released') {
                          return {
                            ...t,
                            status: 'Available',
                            heldBy: null,
                            holdExpiry: null
                          };
                        } else if (data.action === 'sold') {
                          return {
                            ...t,
                            status: 'Sold',
                            heldBy: data.heldBy,
                            holdExpiry: null
                          };
                        }
                      }
                      return t;
                    });
                  });
                }
              } catch (err) {
                console.error("SSE parse error:", err);
              }
            };

            es.onerror = () => {
              console.warn("SSE disconnected, retrying in 5s...");
              es.close();
              setTimeout(() => {
                get().initConnection();
              }, 5000);
            };

          } else {
            throw new Error("Stats status not 200 OK");
          }
        } catch (err) {
          console.warn("Backend API offline. Running in Local Mock Mode.", err);
          set({ isUsingBackend: false });

          // Load local mock tickets or generate them
          const savedMockTickets = localStorage.getItem('ticketbox_tickets_v3');
          if (savedMockTickets) {
            queryClient.setQueryData(['tickets'], JSON.parse(savedMockTickets));
          } else {
            const initial = mockService.getInitialTickets();
            queryClient.setQueryData(['tickets'], initial);
          }

          // Hydration check for mock hold session expiry
          const hold = get().currentUserHold;
          if (hold && hold.expiryTime <= Date.now()) {
            set({ currentUserHold: null });
          }
        }

        // Start background cleaner and simulator intervals
        mockService.startCleanInterval(get, set);
        mockService.startSimulationInterval(get);
      },

      // --- CORE ACTIONS ---
      holdTickets: async (ticketIds, userName) => {
        const { isUsingBackend } = get();
        const tickets = queryClient.getQueryData<Ticket[]>(['tickets']) || [];
        const sortedTicketIds = [...ticketIds].sort();

        if (isUsingBackend) {
          const res = await fetch(`${API_BASE}/api/tickets/hold`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketIds: sortedTicketIds, buyerName: userName || 'Khách hàng' }),
            credentials: 'include'
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Giữ vé thất bại!');
          }

          const expiryTime = Date.now() + 5 * 60 * 1000;
          const heldTicketsInfo = tickets.filter(t => sortedTicketIds.includes(t.id));
          const totalPrice = heldTicketsInfo.reduce((sum, t) => sum + t.price, 0);

          set({
            currentUserHold: {
              ticketIds: sortedTicketIds,
              expiryTime,
              tickets: heldTicketsInfo,
              totalPrice
            }
          });
          
          // Perform direct local cache mutation immediately upon success
          queryClient.setQueryData(['tickets'], (oldTickets: any) => {
            if (!oldTickets) return [];
            return oldTickets.map((t: any) => 
              sortedTicketIds.includes(t.id) 
                ? { ...t, status: 'Holding', heldBy: userName || 'Khách hàng', holdExpiry: expiryTime } 
                : t
            );
          });
          return;
        }

        // Delegate to mockService for local mode
        return mockService.runHoldTicketsMock(ticketIds, userName, set);
      },

      releaseCurrentHold: async () => {
        const { isUsingBackend, currentUserHold } = get();
        if (!currentUserHold) return;

        // Delegate to mockService to update local query cache
        mockService.runReleaseHoldMock(currentUserHold);
        set({ currentUserHold: null });

        if (isUsingBackend) {
          try {
            await fetch(`${API_BASE}/api/tickets/release`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ticketIds: currentUserHold.ticketIds }),
              credentials: 'include'
            });
            
            // Perform direct local cache mutation
            queryClient.setQueryData(['tickets'], (oldTickets: any) => {
              if (!oldTickets) return [];
              return oldTickets.map((t: any) => 
                currentUserHold.ticketIds.includes(t.id) 
                  ? { ...t, status: 'Available', heldBy: null, holdExpiry: null } 
                  : t
              );
            });
          } catch (err) {
            console.error("Error releasing hold:", err);
          }
        }
      },

      confirmPayment: async (customerInfo) => {
        const { isUsingBackend, currentUserHold } = get();
        if (!currentUserHold) throw new Error('Phiên giữ vé đã hết hạn!');

        if (isUsingBackend) {
          // Perform direct local cache mutation
          queryClient.setQueryData(['tickets'], (oldTickets: any) => {
            if (!oldTickets) return [];
            return oldTickets.map((t: any) => 
              currentUserHold.ticketIds.includes(t.id) 
                ? { ...t, status: 'Sold', heldBy: customerInfo.fullName, holdExpiry: null } 
                : t
            );
          });
          set({ currentUserHold: null });
          return;
        }

        // Delegate to mockService for local mode payment
        return mockService.runConfirmPaymentMock(currentUserHold, customerInfo, set);
      },

      resetAllTickets: async () => {
        const { isUsingBackend } = get();
        if (isUsingBackend) {
          try {
            await fetch(`${API_BASE}/api/tickets/reset`, { method: 'POST', credentials: 'include' });
            set({ currentUserHold: null });
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
          } catch (err) {
            console.error("Reset error:", err);
          }
          return;
        }

        // Delegate to mockService for local mode reset
        mockService.runResetAllTicketsMock(set);
      },

      getStats: () => {
        const tickets = queryClient.getQueryData<Ticket[]>(['tickets']) || [];
        let sold = 0;
        let holding = 0;
        let available = 0;
        let revenue = 0;
        let vipAvailable = 0;
        let gaAvailable = 0;
        let standardAvailable = 0;

        tickets.forEach(t => {
          if (t.status === 'Sold') {
            sold++;
            revenue += t.price;
          } else if (t.status === 'Holding') {
            holding++;
          } else {
            available++;
            if (t.type === 'VIP') vipAvailable++;
            else if (t.type === 'GA') gaAvailable++;
            else if (t.type === 'STANDARD') standardAvailable++;
          }
        });

        return {
          sold,
          holding,
          available,
          revenue,
          vipAvailable,
          gaAvailable,
          standardAvailable,
          total: tickets.length || 500
        };
      },

      setSimulationActive: (active) => set({ simulationActive: active })
    }),
    {
      name: 'mini-ticketbox-zustand-v3',
      partialize: (state) => ({
        currentUserHold: state.currentUserHold,
        simulationActive: state.simulationActive,
        isUsingBackend: state.isUsingBackend
      })
    }
  )
);

export type { Ticket };
