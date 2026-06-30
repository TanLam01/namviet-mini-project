import { TICKET_TYPES } from './constants';

export interface Ticket {
  id: string;
  type: string;
  price: number;
  status: string;
  holdExpiry?: number | null;
  heldBy?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerInfo?: { fullName: string; email: string; phone: string } | null;
}

export interface CurrentUserHold {
  ticketIds: string[];
  expiryTime: number;
  tickets: Ticket[];
  totalPrice: number;
}

export interface TicketStoreState {
  currentUserHold: CurrentUserHold | null;
  isUsingBackend: boolean;
  simulationActive: boolean;
  ticketTypes: typeof TICKET_TYPES;
  initConnection: () => Promise<void>;
  holdTickets: (ticketIds: string[], userName: string) => Promise<void>;
  releaseCurrentHold: () => Promise<void>;
  confirmPayment: (customerInfo: { fullName: string; email: string; phone: string }) => Promise<void>;
  resetAllTickets: () => Promise<void>;
  getStats: () => {
    sold: number;
    holding: number;
    available: number;
    revenue: number;
    vipAvailable: number;
    gaAvailable: number;
    standardAvailable: number;
    total: number;
  };
  setSimulationActive: (active: boolean) => void;
}
