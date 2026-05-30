'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Invalid credentials. Please try again.');
      setLoading(false);
      return;
    }

    router.push('/admin');
  };

  return (
    <main className="main-content">
      <div className="page" style={{
        paddingTop: 'calc(var(--sp-12) + env(safe-area-inset-top))',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '100dvh',
      }}>
        {/* Back to join */}
        <a href="/join" style={{ color: 'var(--text-3)', fontSize: '0.875rem', textDecoration: 'none', marginBottom: 'var(--sp-6)', display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          ← Back to Player Join
        </a>

        <div style={{ marginBottom: 'var(--sp-8)', textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 'var(--sp-3)' }}>🔐</span>
          <h1 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.75rem', marginBottom: 'var(--sp-2)' }}>
            Admin Login
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.9375rem' }}>
            Manage matches and sessions
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                type="email"
                className="form-input"
                placeholder="admin@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p style={{ color: 'var(--red)', fontSize: '0.875rem', textAlign: 'center' }}>{error}</p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ opacity: loading ? 0.5 : 1 }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
