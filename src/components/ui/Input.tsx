import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Input({ label, error, hint, id, className, style, ...rest }: InputProps) {
  return (
    <div>
      {label && <div className="label" style={{ marginBottom: '6px' }}>{label}</div>}
      <input
        id={id}
        className={`inp${className ? ` ${className}` : ''}${error ? ' inp-error' : ''}`}
        style={{ borderColor: error ? 'rgba(239,68,68,.4)' : undefined, ...style }}
        {...rest}
      />
      {error && (
        <div style={{ fontSize: '12px', color: '#f87171', marginTop: '4px' }}>{error}</div>
      )}
      {hint && !error && (
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{hint}</div>
      )}
    </div>
  );
}
