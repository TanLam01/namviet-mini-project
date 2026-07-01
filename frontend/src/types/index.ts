import React from 'react';
import { TICKET_TYPES } from '../constants';

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

export interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  backgroundColor: string;
  loading?: boolean;
}

export interface HoldingCountdownProps {
  expiryTime?: string | number | null;
}

export interface HoldingTableProps {
  tickets: Ticket[];
}

export interface SoldTableProps {
  tickets: Ticket[];
}

export interface SeatButtonProps {
  id: string;
  status: string;
  isSelected: boolean;
  loading: boolean;
  onClick: (id: string) => void;
}

export interface TicketSeatGridProps {
  tickets: Ticket[];
  selectedType: string;
  loading: boolean;
  selectedSeats?: string[];
  handleSelectTicket: (id: string) => void;
}
