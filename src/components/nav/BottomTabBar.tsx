'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface TabItem {
  href: string;
  icon: string;
  label: string;
  matchPrefix?: string;
}

const tabs: TabItem[] = [
  { href: '#score',     icon: '🏏', label: 'Score',    matchPrefix: 'score' },
  { href: '#stats',     icon: '📊', label: 'Stats',    matchPrefix: 'stats' },
  { href: '#scorecard', icon: '📋', label: 'Card',     matchPrefix: 'scorecard' },
  { href: '#session',   icon: '🏆', label: 'Session',  matchPrefix: 'session' },
];

interface BottomTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {tabs.map(tab => (
        <button
          key={tab.matchPrefix}
          className={`nav-tab${activeTab === tab.matchPrefix ? ' active' : ''}`}
          onClick={() => onTabChange(tab.matchPrefix!)}
          aria-label={tab.label}
          aria-current={activeTab === tab.matchPrefix ? 'page' : undefined}
        >
          <span className="nav-icon" aria-hidden="true">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
