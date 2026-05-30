import React from 'react';
import Avatar from './Avatar';
import Badge from './Badge';

type PlayerRole = 'captain' | 'scorer' | 'joker' | 'none';
type TeamSide = 'A' | 'B' | 'unassigned';

interface PlayerCardProps {
  name: string;
  role?: PlayerRole;
  team?: TeamSide;
  teamName?: string;
  onClick?: () => void;
  actions?: React.ReactNode;
}

export default function PlayerCard({ name, role = 'none', team = 'unassigned', teamName, onClick, actions }: PlayerCardProps) {
  const badgeVariant = role === 'captain' ? 'cap' : role === 'scorer' ? 'scorer' : role === 'joker' ? 'joker' : 'none';
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'var(--s2)', borderRadius: '10px', cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick}
    >
      <Avatar name={name} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        {teamName && <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{teamName}</div>}
      </div>
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        {role !== 'none' && <Badge variant={badgeVariant}>{role === 'captain' ? 'Cap' : role === 'scorer' ? 'Scorer' : '🃏'}</Badge>}
        {actions}
      </div>
    </div>
  );
}
