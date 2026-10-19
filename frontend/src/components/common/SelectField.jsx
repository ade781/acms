import React, { forwardRef } from 'react';

const SelectField = forwardRef(function SelectField(
  {
    label,
    id,
    value,
    onChange,
    options = [],
    error,
    helperText,
    required = false,
    disabled = false,
    placeholder = 'Pilih opsi...',
    className = '',
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-slate-700 flex items-center justify-between">
          <span>
            {label} {required && <span className="text-red-500">*</span>}
          </span>
        </label>
      )}

      <select
        ref={ref}
        id={selectId}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 min-h-[44px]
          transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-100 disabled:text-slate-500
          ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
              : 'border-slate-300 focus:border-red-600 focus:ring-red-100'
          }`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const labelText = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={val} value={val}>
              {labelText}
            </option>
          );
        })}
      </select>

      {error ? (
        <p className="text-xs text-red-600 mt-0.5">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
});

export default SelectField;
