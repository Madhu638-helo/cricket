import React from 'react';

type BadgeVariant = 'live' | 'upcoming' | 'done' | 'green' | 'cap' | 'scorer' | 'joker' | 'none';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
}

const tagClass: Record<BadgeVariant, string> = {
  live:     'tag tag-live',
  upcoming: 'tag tag-up',
  done:     'tag tag-done',
  green:    'tag tag-green',
  cap:      'role role-cap',
  scorer:   'role role-scorer',
  joker:    'role role-joker',
  none:     'role role-none',
};

export default function Badge({ variant = 'none', children, dot = false }: BadgeProps) {
  return (
    <span className={tagClass[variant]}>
      {dot && <span className="ldot" style={{ width: '6px', height: '6px' }} />}
      {children}
    </span>
  );
}
