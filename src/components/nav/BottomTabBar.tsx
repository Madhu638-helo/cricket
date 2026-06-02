'use client';
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface NavTab {
  key: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

// SF Symbol-inspired SVG icons
const HomeIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-5h-6v5H4a1 1 0 01-1-1V10.5z"/>
    <path d="M12 3v2" strokeWidth="1.2"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12C1 12 5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const TrophyIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2h12v8a6 6 0 01-12 0V2z"/>
    <path d="M6 6H3a2 2 0 000 4c.9 0 1.7-.4 2.3-1M18 6h3a2 2 0 010 4c-.9 0-1.7-.4-2.3-1"/>
    <path d="M12 16v4M9 20h6"/>
    <path d="M8 16.5C9.2 17 10.5 17.3 12 17.3s2.8-.3 4-.8"/>
  </svg>
);

const PersonCircleIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 13a3 3 0 100-6 3 3 0 000 6z"/>
    <path d="M5.5 20.5c.5-3 3.3-5.2 6.5-5.2s6 2.2 6.5 5.2"/>
  </svg>
);

const navTabs: NavTab[] = [
  { key: 'home', label: 'Home', path: '/', icon: <HomeIcon /> },
  { key: 'watch', label: 'Watch', path: '/watch', icon: <EyeIcon /> },
  { key: 'rankings', label: 'Rankings', path: '/leaderboard', icon: <TrophyIcon /> },
  { key: 'profile', label: 'Profile', path: '/profile', icon: <PersonCircleIcon /> },
];

// Match tab icons
const LiveIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
  </svg>
);

const PieIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/>
  </svg>
);

const CardIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="3" width="14" height="18" rx="2"/>
    <path d="M9 8h6M9 12h6M9 16h4"/>
  </svg>
);

const LayersIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
  </svg>
);

const matchTabs = [
  { key: 'score', label: 'Live', icon: <LiveIcon /> },
  { key: 'stats', label: 'Stats', icon: <PieIcon /> },
  { key: 'scorecard', label: 'Card', icon: <CardIcon /> },
  { key: 'session', label: 'Session', icon: <LayersIcon /> },
];

interface MatchTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MatchTabBar({ activeTab, onTabChange }: MatchTabBarProps) {
  return (
    <nav className="bnav">
      {matchTabs.map(tab => (
        <button
          key={tab.key}
          className={`bnav-btn${activeTab === tab.key ? ' act' : ''}`}
          onClick={() => onTabChange(tab.key)}
          aria-label={tab.label}
          style={activeTab === tab.key ? { color: 'var(--live)' } : { color: 'var(--muted)' }}
        >
          <div className="pip" style={activeTab === tab.key ? { background: 'var(--live-lo)', borderRadius: '10px', padding: '4px 10px' } : {}}>
            {tab.icon}
          </div>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

// Default export: global nav for main app screens
export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  function isActive(tab: NavTab): boolean {
    if (tab.path === '/') return pathname === '/';
    return pathname.startsWith(tab.path);
  }

  return (
    <nav className="bnav">
      {navTabs.map(tab => {
        const active = isActive(tab);
        return (
          <button
            key={tab.key}
            className={`bnav-btn${active ? ' act' : ''}`}
            onClick={() => router.push(tab.path)}
            aria-label={tab.label}
            style={active ? { color: 'var(--live)' } : { color: 'var(--muted)' }}
          >
            <div className="pip" style={active ? { background: 'var(--live-lo)', borderRadius: '10px', padding: '4px 10px' } : {}}>
              {tab.icon}
            </div>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

// Legacy export for match page compatibility
export function BottomTabBar({ activeTab, onTabChange }: MatchTabBarProps) {
  return <MatchTabBar activeTab={activeTab} onTabChange={onTabChange} />;
}
