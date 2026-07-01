import React, { createContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTicketStore } from '../store/useTicketStore';
import type { Ticket, TicketStoreState } from '../types';
import { API_BASE } from '../constants';

export interface TicketContextType extends TicketStoreState {
  tickets: Ticket[];
  ticketsLoading: boolean;
}

export const TicketContext = createContext<TicketContextType | null>(null);

// Query function to fetch tickets from Go API or read from local mock storage
const fetchTicketsQuery = async (): Promise<Ticket[]> => {
  const { isUsingBackend } = useTicketStore.getState();
  if (isUsingBackend) {
    const res = await fetch(`${API_BASE}/api/tickets`, { credentials: 'include' });
    if (!res.ok) throw new Error("Failed to fetch tickets from server");
    const data = await res.json();
    // Cache inside localStorage to preserve Stale-While-Revalidate fallback on next page load
    localStorage.setItem('ticketbox_cached_tickets', JSON.stringify(data));
    return data;
  }
  
  // Local Mock Mode
  const saved = localStorage.getItem('mini_ticketbox_tickets_v3');
  return saved ? JSON.parse(saved) : [];
};

export const TicketProvider = ({ children }: { children: React.ReactNode }) => {
  const initConnection = useTicketStore((state) => state.initConnection);

  // Initialize store connection, SSE and background intervals on mount
  useEffect(() => {
    initConnection();
  }, [initConnection]);

  // Use TanStack Query to fetch and cache tickets list with initialData fallback (SWR)
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: ['tickets'],
    queryFn: fetchTicketsQuery,
    initialData: () => {
      try {
        // Read isUsingBackend directly from localStorage to bypass Zustand store hydration delay on mount
        let isBackendSaved = false;
        const savedZustand = localStorage.getItem('mini-ticketbox-zustand-v3');
        if (savedZustand) {
          const parsed = JSON.parse(savedZustand);
          if (parsed && parsed.state && parsed.state.isUsingBackend) {
            isBackendSaved = true;
          }
        }

        if (isBackendSaved) {
          const savedCache = localStorage.getItem('ticketbox_cached_tickets');
          return savedCache ? JSON.parse(savedCache) : undefined;
        } else {
          const savedMock = localStorage.getItem('mini_ticketbox_tickets_v3');
          return savedMock ? JSON.parse(savedMock) : undefined;
        }
      } catch (err) {
        console.error("Error parsing initial data for query:", err);
      }
      return undefined;
    }
  });

  // Pull store values and pass through the context provider
  const store = useTicketStore();

  // Combine query tickets state and loading into the context value
  const contextValue: TicketContextType = {
    ...store,
    tickets,
    ticketsLoading,
  };

  return (
    <TicketContext.Provider value={contextValue}>
      {children}
    </TicketContext.Provider>
  );
};

