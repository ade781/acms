import React, { forwardRef } from 'react';

const TextareaField = forwardRef(function TextareaField(
  {
    label,
    id,
    value,
    onChange,
    placeholder,
    error,
    helperText,
    required = false,
    disabled = false,
    rows = 3,
    className = '',
    ...props
  },
  ref
) {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={textareaId} className="text-xs font-semibold text-slate-700 flex items-center justify-between">
          <span>
            {label} {required && <span className="text-red-500">*</span>}
          </span>
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400
          transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-100 disabled:text-slate-500 resize-y
          ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
              : 'border-slate-300 focus:border-red-600 focus:ring-red-100'
          }`}
        {...props}
      />

      {error ? (
        <p className="text-xs text-red-600 mt-0.5">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
});

export default TextareaField;
