import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-slate-800/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl ${className}`}>
      {children}
    </div>
  );
};