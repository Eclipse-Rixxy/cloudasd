'use client';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

const FEATURES = [
  { icon: '◎', title: 'Username Recon', desc: 'Scan 50+ platforms simultaneously. GitHub, Reddit, TikTok, Steam — found in seconds.' },
  { icon: '◉', title: 'Email Analysis', desc: 'MX validation, SPF/DMARC/DKIM checks, breach exposure, disposable detection, pattern analysis.' },
  { icon: '◈', title: 'IP Intelligence', desc: 'Live geolocation, ASN, reverse DNS, proxy/VPN detection, Shodan integration.' },
  { icon: '◇', title: 'Domain Inspector', desc: 'Full DNS enumeration, email security posture, server location, cert transparency.' },
  { icon: '◆', title: 'Data Breach Lookup', desc: "Check domains and emails against breach databases. See what's exposed and when." },
  { icon: '⬡', title: 'AI Analyst', desc: 'Claude-powered intelligence synthesis. Feed it findings, get structured threat assessments.' },
  { icon: '◐', title: 'Phone OSINT', desc: 'Country code decode, carrier lookup, social reverse lookup via public services.' },
  { icon: '◑', title: 'Discord Intel', desc: 'Snowflake decode, account creation date, profile links, avatar CDN.' },
];

const STATS = [
  { n: '50+', l: 'Platforms scanned' },
  { n: '8', l: 'Intel modules' },
  { n: '< 5s', l: 'Average scan time' },
  { n: '100%', l: 'Privacy focused' },
];

const WORDS = ['username', 'email address', 'IP address', 'domain', 'phone number', 'Discord ID'];

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const [typed, setTyped] = useState('');
  const [wIdx, setWIdx] = useState(0);
  const [cIdx, setCIdx] = useState(0);
  const [del, setDel] = useState(false);

  useEffect(() => {
    const word = WORDS[wIdx];
    const delay = del ? 40 : cIdx === word.length ? 1800 : 70;
    const t = setTimeout(() => {
      if (!del && cIdx < word.length) { setTyped(word.slice(0, cIdx + 1)); setCIdx(c => c + 1); }
      else if (!del && cIdx === word.length) setDel(true);
      else if (del && cIdx > 0) { setTyped(word.slice(0, cIdx - 1)); setCIdx(c => c - 1); }
      else { setDel(false); setWIdx(i => (i + 1) % WORDS.length); }
    }, delay);
    return () => clearTimeout(t);
  }, [cIdx, del, wIdx]);

  const go = () => router.push(session ? '/dashboard' : '/auth');

  return (
    <div className="land">
      <nav className="land-nav">
        <div className="land-nav-inner">
          <div className="land-logo">
            <div className="logo-mark-sm">
              <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" fill="#0a0b0d"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="#0a0b0d" strokeWidth="1.2"/></svg>
            </div>
            <span className="land-logo-text">CLOUD<span>SINT</span></span>
          </div>
          <div className="land-nav-links">
            <a href="/pricing">Pricing</a>
            <a href="/dashboard">Tool</a>
            {session ? (
              <button className="land-btn-sm" onClick={() => router.push('/dashboard')}>Dashboard</button>
            ) : (
              <>
                <button className="land-btn-ghost" onClick={() => router.push('/auth')}>Sign in</button>
                <button className="land-btn-sm" onClick={() => router.push('/auth?tab=register')}>Get started</button>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="land-hero">
        <div className="land-grid-bg" aria-hidden="true" />
        <div className="land-hero-inner">
          <div className="land-badge">Made by S &nbsp;·&nbsp; Open Source Intelligence</div>
          <h1 className="land-h1">
            Investigate any<br />
            <span className="land-accent-text">{typed}<span className="land-cursor">|</span></span>
          </h1>
          <p className="land-sub">
            CloudSINT is a professional OSINT platform. Scan usernames across 50+ platforms, analyze emails, geolocate IPs, enumerate DNS, check data breaches, and run AI-powered intelligence reports.
          </p>
          <div className="land-hero-btns">
            <button className="land-btn-primary" onClick={go}>{session ? 'Open Dashboard →' : 'Start for free →'}</button>
            <button className="land-btn-outline" onClick={() => router.push('/pricing')}>View pricing</button>
          </div>
          <p className="land-hero-note">5 free lookups · No card required · Upgrade anytime</p>
        </div>
        <div className="land-terminal">
          <div className="land-terminal-bar">
            <span className="tb tb-r"/><span className="tb tb-y"/><span className="tb tb-g"/>
            <span className="land-terminal-title">cloudsint — scan</span>
          </div>
          <div className="land-terminal-body">
            <div className="lt-line"><span className="lt-prompt">$</span> cloudsint scan --username johndoe</div>
            <div className="lt-line lt-dim">[init] Checking 50 platforms...</div>
            <div className="lt-line"><span className="lt-green">✓</span> GitHub &nbsp;<span className="lt-dim">github.com/johndoe</span></div>
            <div className="lt-line"><span className="lt-green">✓</span> Reddit &nbsp;<span className="lt-dim">reddit.com/user/johndoe</span></div>
            <div className="lt-line"><span className="lt-green">✓</span> HackerNews</div>
            <div className="lt-line"><span className="lt-green">✓</span> Keybase &nbsp;<span className="lt-dim">keybase.io/johndoe</span></div>
            <div className="lt-line lt-dim">· Twitter/X &nbsp;not found</div>
            <div className="lt-line"><span className="lt-green">✓</span> Steam &nbsp;<span className="lt-dim">steamcommunity.com/id/johndoe</span></div>
            <div className="lt-line lt-dim">[done] <span className="lt-green">14 found</span> / 50 checked in 3.2s</div>
            <div className="lt-line"><span className="lt-prompt">$</span> <span className="lt-blink">_</span></div>
          </div>
        </div>
      </section>

      <section className="land-stats">
        {STATS.map(s => (
          <div key={s.l} className="land-stat">
            <div className="land-stat-n">{s.n}</div>
            <div className="land-stat-l">{s.l}</div>
          </div>
        ))}
      </section>

      <section className="land-section">
        <div className="land-section-inner">
          <div className="land-section-tag">Modules</div>
          <h2 className="land-h2">Everything you need for open source recon</h2>
          <div className="land-features">
            {FEATURES.map(f => (
              <div key={f.title} className="land-feature">
                <div className="land-feature-icon">{f.icon}</div>
                <div className="land-feature-title">{f.title}</div>
                <div className="land-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="land-section land-breach-section">
        <div className="land-section-inner land-two-col">
          <div className="land-col-text">
            <div className="land-section-tag">Breach Intelligence</div>
            <h2 className="land-h2-sm">See what&apos;s been exposed</h2>
            <p className="land-col-desc">
              When you look up a domain, CloudSINT checks against known data breach records — showing which sites were compromised, how many records leaked, and what data types were exposed.
            </p>
            <ul className="land-list">
              <li>Domain breach history with record counts</li>
              <li>Email exposure across billions of records</li>
              <li>Links to DeHashed, IntelX, HaveIBeenPwned</li>
              <li>Risk scoring based on breach severity</li>
            </ul>
          </div>
          <div className="land-col-visual">
            <div className="land-breach-card">
              <div className="lbc-header">
                <span className="lbc-dot"/>
                <span className="lbc-title">Breach report — example.com</span>
                <span className="lbc-badge-red">3 breaches</span>
              </div>
              {[
                { name:'ExampleBreach 2023', records:'142M records', data:'Emails, passwords, usernames', date:'March 2023' },
                { name:'DataDump 2021', records:'38M records', data:'Emails, phone numbers', date:'November 2021' },
                { name:'ComboList 2020', records:'9.2M records', data:'Credential pairs', date:'June 2020' },
              ].map(b => (
                <div key={b.name} className="lbc-item">
                  <div className="lbc-name">{b.name}</div>
                  <div className="lbc-meta">{b.records} · {b.data}</div>
                  <div className="lbc-date">Leaked: {b.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="land-section">
        <div className="land-section-inner">
          <div className="land-section-tag">Pricing</div>
          <h2 className="land-h2">Simple, transparent pricing</h2>
          <div className="land-plans">
            {[
              { name:'Guest', price:'Free', sub:'No account needed', features:['5 lookups total','All 8 modules','Export results'], dim:['No history','No AI Analyst'], cta:'Try now', action: go, outline:true },
              { name:'Free Account', price:'$0', per:'/mo', sub:'Email or Google', features:['20 lookups / day','All 8 modules','Export JSON/CSV/TXT','Lookup history','AI Analyst access'], cta:'Sign up free', action: () => router.push('/auth?tab=register'), featured:true },
              { name:'Pro', price:'$9', per:'/mo', sub:'Power users', features:['200 lookups / day','All 8 modules','Priority AI analysis','Full history & export','Email support'], cta:'Get Pro', action: () => router.push('/pricing'), outline:true },
              { name:'Unlimited', price:'$29', per:'/mo', sub:'No limits', features:['Unlimited lookups','All modules + API access','Bulk scan mode','Priority support','Custom branding'], cta:'Get Unlimited', action: () => router.push('/pricing'), outline:true },
            ].map(p => (
              <div key={p.name} className={`land-plan${p.featured ? ' lp-featured' : ''}`}>
                {p.featured && <div className="lp-popular">Most popular</div>}
                <div className="lp-name">{p.name}</div>
                <div className="lp-price">{p.price}{p.per && <span>{p.per}</span>}</div>
                <div className="lp-sub">{p.sub}</div>
                <ul className="lp-features">
                  {p.features.map(f => <li key={f}>{f}</li>)}
                  {(p.dim||[]).map(f => <li key={f} className="lp-dim">{f}</li>)}
                </ul>
                <button className={p.featured ? 'land-btn-primary lp-btn' : 'land-btn-outline lp-btn'} onClick={p.action}>{p.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="land-cta">
        <div className="land-cta-inner">
          <h2 className="land-h2">Start your investigation</h2>
          <p className="land-cta-sub">No credit card. 5 free lookups as a guest. 20/day with a free account.</p>
          <button className="land-btn-primary land-btn-lg" onClick={go}>{session ? 'Open Dashboard →' : 'Get started free →'}</button>
        </div>
      </section>

      <footer className="land-footer">
        <div className="land-footer-inner">
          <div className="land-logo">
            <div className="logo-mark-sm"><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" fill="#0a0b0d"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="#0a0b0d" strokeWidth="1.2"/></svg></div>
            <span className="land-logo-text">CLOUD<span>SINT</span></span>
          </div>
          <div className="land-footer-links">
            <a href="/dashboard">Tool</a>
            <a href="/pricing">Pricing</a>
            <a href="/auth">Sign in</a>
          </div>
          <div className="land-footer-credit">Made by <strong>S</strong> &nbsp;·&nbsp; For educational &amp; ethical use only</div>
        </div>
      </footer>
    </div>
  );
}
