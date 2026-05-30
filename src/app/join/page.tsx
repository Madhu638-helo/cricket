'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import BottomNavigation from '@/components/nav/BottomTabBar';

export default function JoinPage() {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam) setCode(codeParam.toUpperCase());

    fetch('/api/auth/me')
      .then(r => r.json())
      .then(({ user }) => {
        if (!user) { 
          const redirect = encodeURIComponent(window.location.pathname + window.location.search);
          router.push(`/login?redirect=${redirect}`); 
          return; 
        }
        setUser(user);
      })
      .catch(() => {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        router.push(`/login?redirect=${redirect}`);
      });
  }, [router]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !code.trim()) return;
    setLoading(true);
    setError('');

    const trimmedCode = code.trim().toUpperCase();

    const { data: session, error: se } = await supabase
      .from('sessions')
      .select('id, status')
      .eq('code', trimmedCode)
      .single();

    if (se || !session) {
      setError('Match not found. Check the code and try again.');
      setLoading(false);
      return;
    }

    if (session.status === 'finished') {
      setError('This session has already ended.');
      setLoading(false);
      return;
    }

    const { error: pe } = await supabase
      .from('players')
      .insert({ session_id: session.id, name: user.name, user_id: user.id });

    if (pe) {
      if (pe.code === '23505') {
        // Already joined
        router.push(`/match/${trimmedCode}/lobby`);
        return;
      }
      setError('Could not join. Please try again.');
      setLoading(false);
      return;
    }

    if ('vibrate' in navigator) navigator.vibrate(50);
    router.push(`/match/${trimmedCode}/lobby`);
  };

  return (
    <div id="s-join" className="screen">
      <div className="hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost" style={{ width: '36px', height: '36px', padding: 0, borderRadius: '10px' }} onClick={() => router.push('/')}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div className="heading" style={{ fontSize: '20px' }}>Join Match</div>
        </div>
      </div>
      <div style={{ padding: '32px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>🏏</div>
          <div className="heading" style={{ fontSize: '22px', marginBottom: '6px' }}>Enter Match Code</div>
          <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Ask the match creator for the 6-character code</div>
        </div>

        <form onSubmit={handleJoin}>
          <div style={{ marginBottom: '20px' }}>
            <div className="label">Match Code</div>
            <input 
              className="inp" 
              placeholder="SP-XXXX" 
              style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '4px', textAlign: 'center', textTransform: 'uppercase' }} 
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              required
            />
            {error && <div style={{ fontSize: '12px', color: '#f87171', marginTop: '6px', textAlign: 'center' }}>{error}</div>}
          </div>

          <button 
            type="submit" 
            className="btn btn-red btn-full" 
            style={{ padding: '16px', fontSize: '15px', opacity: (loading || !user || code.length < 6) ? 0.4 : 1 }} 
            disabled={loading || !user || code.length < 6}
          >
            {loading ? 'Joining...' : 'Join Match'}
          </button>
        </form>
      </div>
      <BottomNavigation />
    </div>
  );
}
