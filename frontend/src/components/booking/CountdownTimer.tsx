import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

export const CountdownTimer = ({ expiryTime, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const diff = expiryTime - Date.now();
      if (diff <= 0) {
        setTimeLeft(0);
        if (timerRef.current) clearInterval(timerRef.current);
        onExpire();
      } else {
        setTimeLeft(Math.floor(diff / 1000));
      }
    };

    calculateTimeLeft();
    timerRef.current = setInterval(calculateTimeLeft, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [expiryTime, onExpire]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isUrgent = timeLeft < 60;

  return (
    <div 
      className={`glass-card p-6 text-center border rounded-md ${
        isUrgent 
          ? 'pulse-border border-(--accent) bg-[rgba(255,0,127,0.05)]' 
          : 'border-(--border-color) bg-(--bg-card)'
      }`}
    >
      <div className={`flex justify-center items-center gap-2 mb-2 ${isUrgent ? 'text-(--accent)' : 'text-(--warning)'}`}>
        <Clock size={20} />
        <span className="text-[0.85rem] font-bold">THỜI GIAN GIỮ VÉ CÒN LẠI</span>
      </div>
      
      <div className={`text-4xl font-black font-mono tracking-wider ${isUrgent ? 'text-(--accent)' : 'text-(--text-primary)'}`}>
        {formatTime(timeLeft)}
      </div>
      
      <p className="text-(--text-secondary) text-[0.75rem] mt-2">
        Vui lòng không đóng trình duyệt hoặc refresh trang trong quá trình này.
      </p>
    </div>
  );
};
