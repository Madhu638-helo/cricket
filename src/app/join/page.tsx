'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useInstallPrompt } from '@/lib/hooks/useInstallPrompt';

export default function JoinPage() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();
  const { isInstallable, promptInstall } = useInstallPrompt();

  // Remember name from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cricket_player_name');
    if (saved) setName(saved);
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setLoading(true);
    setError('');

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    // Find session by code
    const { data: session, error: se } = await supabase
      .from('sessions')
      .select('id, status')
      .eq('code', trimmedCode)
      .single();

    if (se || !session) {
      setError('Invalid match code. Please check and try again.');
      setLoading(false);
      return;
    }

    if (session.status === 'finished') {
      setError('This session has already ended.');
      setLoading(false);
      return;
    }

    // Insert player (UNIQUE constraint handles duplicates)
    const { error: pe } = await supabase
      .from('players')
      .insert({ session_id: session.id, name: trimmedName });

    if (pe) {
      if (pe.code === '23505') {
        // Duplicate — player already in session, just re-join
        localStorage.setItem('cricket_player_name', trimmedName);
        localStorage.setItem('cricket_session_code', trimmedCode);
        router.push(`/lobby/${trimmedCode}`);
        return;
      }
      setError('Could not join. Please try again.');
      setLoading(false);
      return;
    }

    localStorage.setItem('cricket_player_name', trimmedName);
    localStorage.setItem('cricket_session_code', trimmedCode);
    // Vibrate on success
    if ('vibrate' in navigator) navigator.vibrate(50);
    router.push(`/lobby/${trimmedCode}`);
  };

  return (
    <main className="main-content">
      <div className="page" style={{ paddingTop: 'calc(var(--sp-8) + env(safe-area-inset-top))' }}>
        {/* Logo / Hero */}
        <div className="text-center mb-4" style={{ marginBottom: 'var(--sp-8)' }}>
          <div style={{
            fontSize: '4rem',
            marginBottom: 'var(--sp-3)',
            filter: 'drop-shadow(0 0 20px rgba(0,255,136,0.4))',
          }}>🏏</div>
          <h1 style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 900,
            fontSize: 'clamp(1.75rem, 9vw, 2.5rem)',
            background: 'linear-gradient(135deg, #f0f8ff 30%, #00ff88)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 'var(--sp-2)',
          }}>
            Cricket Score Pro
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.9375rem' }}>
            Fast. Live. Mobile-first.
          </p>
        </div>

        {/* Join Card */}
        <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
          <h2 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.25rem', marginBottom: 'var(--sp-5)', color: 'var(--text-1)' }}>
            Join a Match
          </h2>

          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="player-name">Your Name</label>
              <input
                id="player-name"
                type="text"
                className="form-input"
                placeholder="e.g. Rahul Kumar"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
                autoCapitalize="words"
                maxLength={30}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="match-code">Match Code</label>
              <input
                id="match-code"
                type="text"
                className="form-input code-input"
                placeholder="XXXXXX"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                required
              />
            </div>

            {error && (
              <p style={{ color: 'var(--red)', fontSize: '0.875rem', textAlign: 'center' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading || !name.trim() || code.length < 6}
              style={{ opacity: loading || !name.trim() || code.length < 6 ? 0.5 : 1 }}
            >
              {loading ? 'Joining...' : 'Join Match →'}
            </button>
          </form>
        </div>

        {/* Admin link */}
        <div className="text-center">
          <a
            href="/login"
            style={{
              color: 'var(--text-3)',
              fontSize: '0.875rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--sp-2)',
              padding: 'var(--sp-3)',
            }}
          >
            🔐 Admin Login
          </a>
        </div>

        {/* PWA Install prompt */}
        {isInstallable && (
          <div className="card mt-4" style={{ marginTop: 'var(--sp-4)', background: 'var(--green-bg)', borderColor: 'var(--border-accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <span style={{ fontSize: '1.5rem' }}>📱</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, color: 'var(--green)', fontSize: '0.9375rem' }}>
                  Install App
                </p>
                <p style={{ color: 'var(--text-2)', fontSize: '0.8125rem' }}>
                  Add to home screen for best experience
                </p>
              </div>
              <button
                onClick={promptInstall}
                className="btn btn-primary btn-sm"
              >
                Install
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
