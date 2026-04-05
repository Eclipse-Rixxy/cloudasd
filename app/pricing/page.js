'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const PLANS = [
  {
    id: 'free',
    name: 'Free Account',
    price: '$0',
    per: '/month',
    sub: 'Sign up with email or Google',
    color: 'var(--accent)',
    features: [
      '20 lookups per day',
      'All 8 OSINT modules',
      'Username scan — 50+ platforms',
      'Email, IP, domain, phone, Discord',
      'Export results (JSON / CSV / TXT)',
      'AI Analyst — Claude powered',
      'Lookup history',
    ],
    cta: 'Sign up free',
    stripePlan: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9',
    per: '/month',
    sub: 'For security researchers & journalists',
    color: '#a855f7',
    featured: true,
    features: [
      '200 lookups per day',
      'Everything in Free',
      'Priority AI analysis',
      'Bulk username scanning',
      'Full export history',
      'Email support',
      'Early access to new modules',
    ],
    cta: 'Get Pro',
    stripePlan: 'pro',
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: '$29',
    per: '/month',
    sub: 'For teams and power users',
    color: '#ffcc00',
    features: [
      'Unlimited lookups',
      'Everything in Pro',
      'API access (10k req/day)',
      'Custom branding / white-label',
      'Priority support (24h response)',
      'Commercial use license',
      'Dedicated Slack channel',
    ],
    cta: 'Get Unlimited',
    stripePlan: 'unlimited',
  },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const [err, setErr] = useState('');

  const handlePlan = async (plan) => {
    if (!plan.stripePlan) {
      router.push(session ? '/dashboard' : '/auth?tab=register');
      return;
    }
    if (!session) { router.push('/auth?tab=register'); return; }
    setLoading(plan.id); setErr('');
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: plan.stripePlan }),
    }).then(r => r.json());
    if (res.error) { setErr(res.error); setLoading(''); return; }
    window.location.href = res.url;
  };

  return (
    <div className="land">
      <nav className="land-nav">
        <div className="land-nav-inner">
          <div className="land-logo" style={{ cursor:'pointer' }} onClick={() => router.push('/')}>
            <div className="logo-mark-sm"><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" fill="#0a0b0d"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="#0a0b0d" strokeWidth="1.2"/></svg></div>
            <span className="land-logo-text">CLOUD<span>SINT</span></span>
          </div>
          <div className="land-nav-links">
            <a href="/">Home</a>
            <a href="/dashboard">Tool</a>
            {session
              ? <button className="land-btn-sm" onClick={() => router.push('/dashboard')}>Dashboard</button>
              : <button className="land-btn-sm" onClick={() => router.push('/auth')}>Sign in</button>
            }
          </div>
        </div>
      </nav>

      <div style={{ paddingTop: 100, paddingBottom: 80, background: 'var(--bg)' }}>
        <div className="land-section-inner" style={{ textAlign: 'center', marginBottom: 60 }}>
          <div className="land-section-tag">Pricing</div>
          <h1 className="land-h2" style={{ fontSize: 40 }}>Simple, transparent pricing</h1>
          <p style={{ color: 'var(--text2)', fontFamily: 'var(--sans)', fontSize: 16, marginTop: 12 }}>
            Start free. Upgrade when you need more power.
          </p>
          {session?.user?.plan && session.user.plan !== 'free' && (
            <div style={{ marginTop: 16, display:'inline-block', background:'var(--adim2)', border:'1px solid var(--accent)', borderRadius:8, padding:'8px 16px', color:'var(--accent)', fontSize:12, fontFamily:'var(--mono)' }}>
              Current plan: <strong>{session.user.plan.toUpperCase()}</strong>
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:20, maxWidth:1000, margin:'0 auto', padding:'0 20px', flexWrap:'wrap', justifyContent:'center' }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              flex: '1 1 280px', maxWidth:320,
              background: plan.featured ? 'var(--bg2)' : 'var(--bg2)',
              border: `1px solid ${plan.featured ? plan.color : 'var(--border)'}`,
              borderRadius: 12, padding: '28px 24px', position: 'relative',
              boxShadow: plan.featured ? `0 0 30px ${plan.color}22` : 'none',
            }}>
              {plan.featured && (
                <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:plan.color, color:'#0a0b0d', fontSize:10, fontWeight:700, padding:'3px 12px', borderRadius:20, fontFamily:'var(--sans)', whiteSpace:'nowrap' }}>
                  MOST POPULAR
                </div>
              )}
              <div style={{ fontFamily:'var(--sans)', fontWeight:700, fontSize:18, color:'var(--text)', marginBottom:4 }}>{plan.name}</div>
              <div style={{ fontFamily:'var(--sans)', fontSize:36, fontWeight:700, color: plan.featured ? plan.color : 'var(--text)', lineHeight:1, marginBottom:4 }}>
                {plan.price}<span style={{ fontSize:14, color:'var(--text2)', fontWeight:400 }}>{plan.per}</span>
              </div>
              <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--mono)', marginBottom:20 }}>{plan.sub}</div>
              <ul style={{ listStyle:'none', marginBottom:24 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, fontFamily:'var(--sans)', color:'var(--text2)', padding:'5px 0', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ color: plan.color, fontSize:10 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handlePlan(plan)}
                disabled={loading === plan.id || session?.user?.plan === plan.id}
                style={{
                  width:'100%', padding:'11px 0', borderRadius:8, border:'none',
                  background: plan.featured ? plan.color : 'transparent',
                  border: plan.featured ? 'none' : `1px solid ${plan.color}`,
                  color: plan.featured ? '#0a0b0d' : plan.color,
                  fontFamily:'var(--sans)', fontWeight:700, fontSize:13,
                  cursor: (loading === plan.id || session?.user?.plan === plan.id) ? 'not-allowed' : 'pointer',
                  opacity: session?.user?.plan === plan.id ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {loading === plan.id ? 'Redirecting...' : session?.user?.plan === plan.id ? 'Current plan' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        {err && <div style={{ textAlign:'center', color:'var(--red)', fontSize:12, fontFamily:'var(--mono)', marginTop:20 }}>{err}</div>}

        <div style={{ maxWidth:700, margin:'60px auto 0', padding:'0 20px' }}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'24px 28px' }}>
            <h3 style={{ fontFamily:'var(--sans)', fontWeight:600, fontSize:16, color:'var(--text)', marginBottom:16 }}>FAQ</h3>
            {[
              ['Do I need a credit card to sign up?', 'No. The free account is completely free with no card required. You get 20 lookups per day.'],
              ['What counts as a lookup?', 'Each search you perform counts as one lookup — regardless of module. Username scans, email analysis, IP lookups, etc. all count as one.'],
              ['Can I cancel anytime?', 'Yes. Cancel from your account settings and your plan downgrades to Free at the end of the billing period.'],
              ['What payment methods are accepted?', 'All major credit/debit cards via Stripe. Stripe handles all payments securely — we never store card details.'],
              ['Is this legal?', 'CloudSINT only uses publicly available data sources. It is intended for ethical security research, journalism, and personal privacy awareness. Always obtain proper authorization before investigating others.'],
            ].map(([q, a]) => (
              <div key={q} style={{ marginBottom:16, paddingBottom:16, borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontFamily:'var(--sans)', fontWeight:500, fontSize:13, color:'var(--text)', marginBottom:4 }}>{q}</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text2)', lineHeight:1.6 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="land-footer">
        <div className="land-footer-inner">
          <div className="land-logo">
            <div className="logo-mark-sm"><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" fill="#0a0b0d"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="#0a0b0d" strokeWidth="1.2"/></svg></div>
            <span className="land-logo-text">CLOUD<span>SINT</span></span>
          </div>
          <div className="land-footer-links"><a href="/">Home</a><a href="/dashboard">Tool</a></div>
          <div className="land-footer-credit">Made by <strong>S</strong> &nbsp;·&nbsp; Educational use only</div>
        </div>
      </footer>
    </div>
  );
}
