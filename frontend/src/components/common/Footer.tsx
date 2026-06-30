import React from 'react';
import { Cpu } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="border-t border-(--border-color) p-6 text-center text-xs text-(--text-muted) mt-12">
      <div className="flex justify-center items-center gap-1.5 mb-2">
        <Cpu size={14} />
        <span>Ticket box Demo Platform - Xử lý tải cao & Concurrency</span>
      </div>
      <p>© 2026 Nam Việt Media Technical Interview. Made by Lâm Tất</p>
    </footer>
  );
};
