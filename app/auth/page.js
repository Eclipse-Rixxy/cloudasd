'use client';
import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') === 'register' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const handleGoogle = () => signIn('google', { callbackUrl: '/dashboard' });

  const handleSubmit = async () => {
    setErr(''); setOk(''); setLoading(true);
    if (tab === 'register') {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      }).then(r => r.json());
      if (res.error) { setErr(res.error); setLoading(false); return; }
      setOk('Account created! Signing you in...');
      const r = await signIn('credentials', { email, password, redirect: false });
      if (r?.error) { setErr('Login failed after register. Try signing in.'); setLoading(false); return; }
      router.push('/dashboard');
    } else {
      const r = await signIn('credentials', { email, password, redirect: false });
      if (r?.error) { setErr('Invalid email or password'); setLoading(false); return; }
      router.push('/dashboard');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden="true" />
      <div className="auth-box">
        <div className="auth-logo" onClick={() => router.push('/')}>
          <div className="logo-mark-sm"><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" fill="#0a0b0d"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="#0a0b0d" strokeWidth="1.2"/></svg></div>
          <span className="land-logo-text">CLOUD<span>SINT</span></span>
        </div>
        <div className="auth-tabs">
          <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => setTab('login')}>Sign in</button>
          <button className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => setTab('register')}>Create account</button>
        </div>

        <button className="auth-google" onClick={handleGoogle}>
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider"><span>or</span></div>

        {tab === 'register' && (
          <input className="auth-input" type="text" placeholder="Name (optional)" value={name} onChange={e => setName(e.target.value)} />
        )}
        <input className="auth-input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        <input className="auth-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />

        {err && <div className="auth-err">{err}</div>}
        {ok && <div className="auth-ok">{ok}</div>}

        <button className="land-btn-primary auth-submit" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Please wait...' : tab === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <div className="auth-footer-note">
          {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button className="auth-switch" onClick={() => setTab(tab === 'login' ? 'register' : 'login')}>
            {tab === 'login' ? 'Create one free' : 'Sign in'}
          </button>
        </div>
        <div className="auth-footer-note" style={{ marginTop: 8 }}>
          <button className="auth-switch" onClick={() => router.push('/dashboard')}>Continue as guest (5 lookups)</button>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}
