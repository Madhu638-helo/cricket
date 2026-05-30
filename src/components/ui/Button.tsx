import React from 'react';

type ButtonVariant = 'red' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  red:     'btn btn-red',
  ghost:   'btn btn-ghost',
  danger:  'btn btn-danger',
  outline: 'btn btn-ghost',
};

const sizeStyle: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: '12px' },
  md: { padding: '12px 16px', fontSize: '14px' },
  lg: { padding: '16px 20px', fontSize: '15px' },
};

export default function Button({
  variant = 'ghost',
  size = 'md',
  full = false,
  loading = false,
  icon,
  children,
  disabled,
  style,
  className,
  ...rest
}: ButtonProps) {
  const cls = `${variantClass[variant]}${full ? ' btn-full' : ''}${className ? ` ${className}` : ''}`;
  return (
    <button
      className={cls}
      disabled={disabled || loading}
      style={{ ...sizeStyle[size], opacity: (disabled || loading) ? 0.5 : 1, ...style }}
      {...rest}
    >
      {icon && !loading && icon}
      {loading ? 'Loading...' : children}
    </button>
  );
}
