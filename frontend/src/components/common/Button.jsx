import React from 'react';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost'
  size = 'md',        // 'sm' | 'md' | 'lg'
  type = 'button',
  disabled = false,
  loading = false,
  icon: Icon,
  className = '',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg select-none transition-colors duration-100 min-h-[44px] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-arff-primary text-white hover:bg-arff-primaryHover focus:ring-red-600',
    secondary: 'bg-slate-800 text-white hover:bg-slate-700 focus:ring-slate-700',
    accent: 'bg-arff-accent text-white hover:bg-arff-accentHover focus:ring-sky-600',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-600',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus:ring-slate-400',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-300',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 min-h-[38px]',
    md: 'text-sm px-4 py-2 min-h-[44px]',
    lg: 'text-base px-5 py-2.5 min-h-[48px]',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span>Memproses...</span>
        </span>
      ) : (
        <span className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
          <span>{children}</span>
        </span>
      )}
    </button>
  );
}
