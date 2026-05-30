import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export default function Select({ label, error, options, id, className, style, ...rest }: SelectProps) {
  return (
    <div>
      {label && <div className="label" style={{ marginBottom: '6px' }}>{label}</div>}
      <select
        id={id}
        className={`inp${className ? ` ${className}` : ''}`}
        style={{ appearance: 'none', cursor: 'pointer', ...style }}
        {...rest}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && (
        <div style={{ fontSize: '12px', color: '#f87171', marginTop: '4px' }}>{error}</div>
      )}
    </div>
  );
}
