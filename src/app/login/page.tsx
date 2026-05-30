'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect) setRedirectUrl(redirect);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const body = mode === 'login'
      ? { username: identifier, password }
      : { name: fullName, username: identifier, password };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    router.push(redirectUrl || data.redirect || '/');
  };

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', overflow: 'auto' }}>

      {/* Hero gradient */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '45vh',
        background: 'linear-gradient(180deg, rgba(227,27,35,0.12) 0%, transparent 100%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{ padding: '40px 24px 40px', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>🏏</div>
          <div className="heading" style={{ fontSize: '28px', letterSpacing: '-0.5px' }}>Turf Cricket</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>Turf Cricket Management Platform</div>
        </div>

        {/* Mode toggle */}
        <div className="toggle" style={{ marginBottom: '24px' }}>
          <button className={`toggle-btn${mode === 'login' ? ' on' : ''}`} onClick={() => { setMode('login'); setError(''); }}>
            Sign In
          </button>
          <button className={`toggle-btn${mode === 'signup' ? ' on' : ''}`} onClick={() => { setMode('signup'); setError(''); }}>
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {mode === 'signup' && (
            <div>
              <div className="label">Full Name</div>
              <input
                id="auth-fullname"
                className="inp"
                type="text"
                placeholder="Rahul Sharma"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <div className="label">Username</div>
            <input
              id="auth-identifier"
              className="inp"
              type="text"
              placeholder={mode === 'signup' ? 'Choose a username' : 'Enter your username'}
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'username' : 'username'}
            />
          </div>

          <div>
            <div className="label">Password</div>
            <input
              id="auth-password"
              className="inp"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239,68,68,.1)',
              border: '1px solid rgba(239,68,68,.2)',
              borderRadius: '10px',
              fontSize: '13px',
              color: '#f87171',
            }}>
              {error}
            </div>
          )}

          <button
            id="auth-submit"
            type="submit"
            className="btn btn-red btn-full"
            style={{ padding: '16px', fontSize: '15px', marginTop: '4px', opacity: loading ? 0.6 : 1 }}
            disabled={loading}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

      </div>
    </div>
  );
}
