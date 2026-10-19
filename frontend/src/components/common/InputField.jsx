import React, { forwardRef } from 'react';

const InputField = forwardRef(function InputField(
  {
    label,
    id,
    type = 'text',
    value,
    onChange,
    placeholder,
    error,
    helperText,
    required = false,
    disabled = false,
    icon: Icon,
    className = '',
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-slate-700 flex items-center justify-between">
          <span>
            {label} {required && <span className="text-red-500">*</span>}
          </span>
        </label>
      )}

      <div className="relative rounded-lg">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 min-h-[44px]
            transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-100 disabled:text-slate-500
            ${Icon ? 'pl-9' : ''}
            ${
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-red-600 focus:ring-red-100'
            }`}
          {...props}
        />
      </div>

      {error ? (
        <p className="text-xs text-red-600 mt-0.5">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
});

export default InputField;
