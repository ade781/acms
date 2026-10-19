import React from 'react';

export default function Badge({
  children,
  variant = 'default', // 'serviceable' | 'unserviceable' | 'pending' | 'pic' | 'primary' | 'info' | 'default'
  size = 'md',
  className = '',
}) {
  const baseStyles = 'inline-flex items-center gap-1 font-semibold select-none rounded-md border';

  const variants = {
    serviceable: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    unserviceable: 'bg-red-50 text-red-800 border-red-300',
    pending: 'bg-amber-50 text-amber-800 border-amber-300',
    pic: 'bg-amber-100 text-amber-900 border-amber-400 font-bold shadow-sm',
    primary: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-sky-50 text-sky-800 border-sky-300',
    default: 'bg-slate-100 text-slate-700 border-slate-300',
    teamAlpha: 'bg-rose-50 text-rose-800 border-rose-300',
    teamBravo: 'bg-blue-50 text-blue-800 border-blue-300',
    teamCharlie: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    teamDelta: 'bg-purple-50 text-purple-800 border-purple-300',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span className={`${baseStyles} ${variants[variant] || variants.default} ${sizes[size] || sizes.md} ${className}`}>
      {children}
    </span>
  );
}
