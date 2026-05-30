'use client';
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface NavTab {
  key: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navTabs: NavTab[] = [
  {
    key: 'home',
    label: 'Home',
    path: '/',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    key: 'watch',
    label: 'Watch',
    path: '/watch',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.862v6.276a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      </svg>
    ),
  },
  {
    key: 'rankings',
    label: 'Rankings',
    path: '/leaderboard',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: 'profile',
    label: 'Profile',
    path: '/profile',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

// Used inside match pages — tab-switcher variant (no routing)
interface MatchTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const matchTabs = [
  { key: 'score', label: 'Live', icon: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )},
  { key: 'stats', label: 'Stats', icon: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
    </svg>
  )},
  { key: 'scorecard', label: 'Card', icon: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )},
  { key: 'session', label: 'Session', icon: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )},
];

export function MatchTabBar({ activeTab, onTabChange }: MatchTabBarProps) {
  return (
    <nav className="bnav">
      {matchTabs.map(tab => (
        <button
          key={tab.key}
          className={`bnav-btn${activeTab === tab.key ? ' act' : ''}`}
          onClick={() => onTabChange(tab.key)}
          aria-label={tab.label}
        >
          <div className="pip">{tab.icon}</div>
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
      {navTabs.map(tab => (
        <button
          key={tab.key}
          className={`bnav-btn${isActive(tab) ? ' act' : ''}`}
          onClick={() => router.push(tab.path)}
          aria-label={tab.label}
        >
          <div className="pip">{tab.icon}</div>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

// Legacy export for match page compatibility
export function BottomTabBar({ activeTab, onTabChange }: MatchTabBarProps) {
  return <MatchTabBar activeTab={activeTab} onTabChange={onTabChange} />;
}
