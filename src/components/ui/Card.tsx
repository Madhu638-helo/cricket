import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  pressable?: boolean;
  padding?: string | number;
  glow?: 'red' | 'green' | 'blue' | 'none';
  children: React.ReactNode;
}

const glowStyles: Record<string, React.CSSProperties> = {
  red:   { borderColor: 'rgba(227,27,35,.2)', background: 'linear-gradient(135deg,rgba(227,27,35,.06),var(--s1))' },
  green: { borderColor: 'rgba(34,197,94,.2)', background: 'linear-gradient(135deg,rgba(34,197,94,.06),var(--s1))' },
  blue:  { borderColor: 'rgba(59,130,246,.2)', background: 'linear-gradient(135deg,rgba(59,130,246,.06),var(--s1))' },
  none:  {},
};

export default function Card({ pressable = false, padding = '16px', glow = 'none', children, className, style, onClick, ...rest }: CardProps) {
  const classes = `card${pressable ? ' card-press' : ''}${className ? ` ${className}` : ''}`;
  return (
    <div
      className={classes}
      style={{ padding, ...glowStyles[glow], ...style }}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  );
}
