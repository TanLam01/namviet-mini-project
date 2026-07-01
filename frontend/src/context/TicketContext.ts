import { createContext } from 'react';
import type { Ticket, TicketStoreState } from '../types';

export interface TicketContextType extends TicketStoreState {
  tickets: Ticket[];
  ticketsLoading: boolean;
}

export const TicketContext = createContext<TicketContextType | null>(null);
