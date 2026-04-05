'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PLATFORMS } from '../../lib/platforms';

// ─── helpers ──────────────────────────────────────────────────────────────────
function getGuestId() {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem('csint_guest');
  if (!id) { id = 'g_' + Math.random().toString(36).slice(2) + Date.now(); localStorage.setItem('csint_guest', id); }
  return id;
}

function exportData(obj, fmt) {
  let out;
  if (fmt === 'json') out = JSON.stringify(obj, null, 2);
  else if (fmt === 'csv') out = Object.entries(obj).map(([k,v]) => `"${k}","${String(v).replace(/"/g,'""')}"`).join('\n');
  else out = Object.entries(obj).map(([k,v]) => `${k}: ${v}`).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([out], { type: 'text/plain' }));
  a.download = `cloudsint_${Date.now()}.${fmt}`;
  a.click();
}

// ─── tiny UI components ───────────────────────────────────────────────────────
const Pill = ({ color, children }) => <span className={`pill pill-${color}`}>{children}</span>;
const KV = ({ label, value }) => <div className="kv-row"><span className="kv-k">{label}</span><span className="kv-v">{value}</span></div>;
const Card = ({ title, badge, children }) => (
  <div className="card">
    <div className="card-head"><span className="card-title">{title}</span>{badge && <span style={{fontSize:10,color:'var(--text3)',fontFamily:'var(--mono)'}}>{badge}</span>}</div>
    <div className="card-body">{children}</div>
  </div>
);
const Spinner = ({ label }) => (
  <div className="loading-state"><div className="scan-bar"><div className="scan-fill"/></div><div className="loading-label">{label}</div></div>
);
const Empty = ({ icon, text, sub }) => (
  <div className="empty-state">
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">{icon}</svg>
    <p>{text}</p>{sub && <p className="sub">{sub}</p>}
  </div>
);
const Exports = ({ obj }) => (
  <div className="export-btns">
    {['json','csv','txt'].map(f => <button key={f} className="export-btn" onClick={() => exportData(obj,f)}>{f.toUpperCase()}</button>)}
  </div>
);
const DNSRow = ({ type, value, small }) => (
  <div className="dns-row"><span className="dns-t">{type}</span><span className="dns-v" style={small?{fontSize:10}:{}}>{value}</span></div>
);

// ─── rate limit gate ──────────────────────────────────────────────────────────
async function gate(type, query, session, router) {
  const guestId = getGuestId();
  const res = await fetch('/api/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, query, guestId }),
  }).then(r => r.json());
  if (res.error === 'RATE_LIMIT') return { blocked: true, ...res };
  return { blocked: false, ...res };
}

// ─── Rate Limit Wall ──────────────────────────────────────────────────────────
function RateLimitWall({ info, onDismiss, router }) {
  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--red)', borderRadius:10, padding:'24px 20px', margin:'20px 0', textAlign:'center' }}>
      <div style={{ fontSize:24, marginBottom:8 }}>🔒</div>
      <div style={{ fontFamily:'var(--sans)', fontWeight:700, fontSize:16, color:'var(--text)', marginBottom:8 }}>
        {info.plan === 'guest' ? 'Guest limit reached' : 'Daily limit reached'}
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text2)', marginBottom:20, lineHeight:1.6 }}>
        {info.message}
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
        {info.plan === 'guest' ? (
          <>
            <button className="land-btn-primary" onClick={() => router.push('/auth?tab=register')}>Sign up free — 20/day</button>
            <button className="land-btn-outline" style={{ fontSize:12, padding:'8px 16px' }} onClick={() => router.push('/pricing')}>View plans</button>
          </>
        ) : (
          <>
            <button className="land-btn-primary" onClick={() => router.push('/pricing')}>Upgrade plan</button>
            <button className="land-btn-outline" style={{ fontSize:12, padding:'8px 16px' }} onClick={onDismiss}>Dismiss</button>
          </>
        )}
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)', marginTop:12 }}>
        {info.count} / {info.limit} lookups used today
      </div>
    </div>
  );
}

// ─── USERNAME ─────────────────────────────────────────────────────────────────
function UsernamePanel({ query }) {
  const [status, setStatus] = useState('idle');
  const [results, setResults] = useState([]);
  const [checked, setChecked] = useState(0);
  const [found, setFound] = useState(0);
  useEffect(() => {
    if (!query) { setStatus('idle'); return; }
    let cancelled = false;
    setStatus('scanning'); setFound(0); setChecked(0);
    setResults(PLATFORMS.map(p => ({ ...p, state:'checking', url: p.u.replace('{}', encodeURIComponent(query)) })));
    (async () => {
      const chunks = [];
      for (let i = 0; i < PLATFORMS.length; i += 6) chunks.push(PLATFORMS.slice(i,i+6));
      let tc=0, tf=0;
      for (const chunk of chunks) {
        if (cancelled) break;
        await Promise.all(chunk.map(async p => {
          const url = p.u.replace('{}', encodeURIComponent(query));
          let state = 'not-found';
          try { await fetch(url,{method:'HEAD',mode:'no-cors',signal:AbortSignal.timeout(4000)}); state='found'; tf++; } catch {}
          tc++;
          if (!cancelled) { setResults(prev=>prev.map(r=>r.n===p.n?{...r,state,url}:r)); setChecked(tc); setFound(tf); }
        }));
        await new Promise(r=>setTimeout(r,60));
      }
      if (!cancelled) setStatus('done');
    })();
    return () => { cancelled = true; };
  }, [query]);
  const foundMap = Object.fromEntries(results.filter(r=>r.state==='found').map(r=>[r.n,r.url]));
  if (status==='idle') return <Empty icon={<><circle cx="20" cy="14" r="7"/><path d="M6 38a14 14 0 0128 0"/></>} text={`Enter a username to scan ${PLATFORMS.length}+ platforms`}/>;
  return (
    <div>
      <div className="result-header"><div className="result-title">Username: <span>{query}</span></div>{status==='done'&&<Exports obj={foundMap}/>}</div>
      <div className="summary-strip">
        <div className="sstat"><div className="sstat-num blue">{PLATFORMS.length}</div><div className="sstat-label">Platforms</div></div>
        <div className="sstat"><div className="sstat-num green">{found}</div><div className="sstat-label">Found</div></div>
        <div className="sstat"><div className="sstat-num">{checked}</div><div className="sstat-label">Checked</div></div>
        <div className="sstat"><div className={`sstat-num ${status==='done'?'':'yellow'}`}>{PLATFORMS.length-checked}</div><div className="sstat-label">Remaining</div></div>
      </div>
      <Card title="Platform Scan" badge={status==='scanning'?`${Math.round(checked/PLATFORMS.length*100)}%`:'complete'}>
        <div className="plat-grid">
          {results.map(r=>(
            <div key={r.n} className={`plat-card ${r.state}`}>
              <div className={`plat-dot ${r.state==='found'?'on':r.state==='checking'?'chk':'off'}`}/>
              <span className="plat-name">{r.n}</span>
              {r.state==='found'&&<a className="plat-link" href={r.url} target="_blank" rel="noopener noreferrer">↗</a>}
            </div>
          ))}
        </div>
      </Card>
      <p className="notice">Due to CORS, &ldquo;found&rdquo; means the server responded. Click ↗ to verify.</p>
    </div>
  );
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────
function EmailPanel({ query }) {
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!query) { setRes(null); return; }
    setLoading(true); setRes(null);
    const email = query.trim();
    const atIdx = email.indexOf('@');
    const local = atIdx>=0?email.slice(0,atIdx):email;
    const domain = atIdx>=0?email.slice(atIdx+1):'';
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const DISP = ['mailinator.com','guerrillamail.com','tempmail.com','10minutemail.com','throwam.com','yopmail.com','sharklasers.com','fakeinbox.com'];
    const FREE = ['gmail.com','yahoo.com','hotmail.com','outlook.com','protonmail.com','icloud.com','aol.com','live.com'];
    const disposable = DISP.includes(domain.toLowerCase());
    const isFree = FREE.includes(domain.toLowerCase());
    Promise.all([
      fetch(`https://dns.google/resolve?name=${domain}&type=MX`).then(r=>r.json()).catch(()=>({Answer:[]})),
      fetch(`https://dns.google/resolve?name=${domain}&type=TXT`).then(r=>r.json()).catch(()=>({Answer:[]})),
      fetch(`https://dns.google/resolve?name=_dmarc.${domain}&type=TXT`).then(r=>r.json()).catch(()=>({Answer:[]})),
    ]).then(([mxR,txtR,dmarcR]) => {
      const mx=mxR.Answer||[];
      const txts=(txtR.Answer||[]).map(t=>t.data);
      const hasSPF=txts.some(t=>t.includes('v=spf1'));
      const hasDMARC=(dmarcR.Answer||[]).some(t=>t.data&&t.data.includes('v=DMARC1'));
      const hasDKIM=txts.some(t=>t.includes('v=DKIM1'));
      const patterns=[];
      if(/^[a-z]+\.[a-z]+$/.test(local))patterns.push('firstname.lastname');
      if(/^\w\.[a-z]+$/.test(local))patterns.push('initial.lastname');
      if(/\d{4}$/.test(local))patterns.push('ends-with-year');
      if(local.includes('_'))patterns.push('underscore-sep');
      const riskLevel=disposable?'HIGH':!mx.length?'MEDIUM':'LOW';
      setRes({email,local,domain,valid,disposable,isFree,mx,txts,hasSPF,hasDMARC,hasDKIM,patterns,riskLevel});
      setLoading(false);
    });
  }, [query]);
  if (!query) return <Empty icon={<><rect x="4" y="8" width="32" height="24" rx="2"/><path d="M4 12l16 12L36 12"/></>} text="Enter an email address to analyze"/>;
  if (loading) return <Spinner label="Analyzing email..."/>;
  if (!res) return null;
  return (
    <div>
      <div className="result-header"><div className="result-title">Email: <span>{res.email}</span></div><Exports obj={{email:res.email,valid:String(res.valid),deliverable:String(!!res.mx.length),disposable:String(res.disposable),spf:String(res.hasSPF),dmarc:String(res.hasDMARC),risk:res.riskLevel}}/></div>
      <div className="summary-strip">
        <div className="sstat"><div className={`sstat-num ${res.valid?'green':'red'}`}>{res.valid?'✓':'✗'}</div><div className="sstat-label">Format</div></div>
        <div className="sstat"><div className={`sstat-num ${res.mx.length?'green':'red'}`}>{res.mx.length?'✓':'✗'}</div><div className="sstat-label">Deliverable</div></div>
        <div className="sstat"><div className={`sstat-num ${!res.disposable?'green':'red'} sm`}>{res.disposable?'DISP':'OK'}</div><div className="sstat-label">Disposable</div></div>
        <div className="sstat"><div className={`sstat-num ${res.riskLevel==='LOW'?'green':res.riskLevel==='MEDIUM'?'yellow':'red'} sm`}>{res.riskLevel}</div><div className="sstat-label">Risk</div></div>
      </div>
      <Card title="Address Analysis">
        <KV label="Local part" value={res.local}/>
        <KV label="Domain" value={res.domain}/>
        <KV label="Format" value={<Pill color={res.valid?'green':'red'}>{res.valid?'VALID':'INVALID'}</Pill>}/>
        <KV label="Provider" value={res.disposable?<Pill color="red">DISPOSABLE</Pill>:res.isFree?<Pill color="yellow">FREE PROVIDER</Pill>:<Pill color="blue">CORPORATE</Pill>}/>
        <KV label="MX / Deliverable" value={<Pill color={res.mx.length?'green':'red'}>{res.mx.length?'YES':'NO MX'}</Pill>}/>
        {res.patterns.length>0&&<KV label="Patterns" value={res.patterns.map(p=><Pill key={p} color="purple">{p}</Pill>)}/>}
      </Card>
      {res.mx.length>0&&<Card title="Mail Servers">{res.mx.map((r,i)=><DNSRow key={i} type="MX" value={r.data}/>)}</Card>}
      <Card title="Email Security">
        <KV label="SPF" value={<Pill color={res.hasSPF?'green':'red'}>{res.hasSPF?'CONFIGURED':'MISSING'}</Pill>}/>
        <KV label="DMARC" value={<Pill color={res.hasDMARC?'green':'red'}>{res.hasDMARC?'CONFIGURED':'MISSING'}</Pill>}/>
        <KV label="DKIM" value={<Pill color={res.hasDKIM?'green':'yellow'}>{res.hasDKIM?'FOUND':'NOT DETECTED'}</Pill>}/>
      </Card>
      <Card title="Breach & Exposure">
        <KV label="HaveIBeenPwned" value={<a href={`https://haveibeenpwned.com/account/${encodeURIComponent(res.email)}`} target="_blank" rel="noopener noreferrer">Check HIBP ↗</a>}/>
        <KV label="IntelligenceX" value={<a href={`https://intelx.io/?s=${encodeURIComponent(res.email)}`} target="_blank" rel="noopener noreferrer">Search IntelX ↗</a>}/>
        <KV label="DeHashed" value={<a href={`https://dehashed.com/search?query=${encodeURIComponent(res.email)}`} target="_blank" rel="noopener noreferrer">Search DeHashed ↗</a>}/>
      </Card>
      {res.txts.length>0&&<Card title="TXT Records">{res.txts.map((t,i)=><DNSRow key={i} type="TXT" value={t} small/>)}</Card>}
    </div>
  );
}

// ─── PHONE ────────────────────────────────────────────────────────────────────
function PhonePanel({ query }) {
  if (!query) return <Empty icon={<><rect x="10" y="2" width="20" height="36" rx="3"/><circle cx="20" cy="33" r="1.5" fill="currentColor"/></>} text="Enter a phone number to analyze"/>;
  const raw=query.trim(), clean=raw.replace(/[\s\-\(\)]/g,''), digits=clean.replace(/\D/g,'');
  const cc=clean.startsWith('+')?digits.length>11?digits.slice(0,2):digits.slice(0,1):'?';
  const REGIONS={'1':'North America','44':'United Kingdom','49':'Germany','33':'France','61':'Australia','91':'India','86':'China','81':'Japan','55':'Brazil','7':'Russia'};
  const valid=digits.length>=7&&digits.length<=15;
  return (
    <div>
      <div className="result-header"><div className="result-title">Phone: <span>{raw}</span></div><Exports obj={{raw,clean,digits,cc:'+'+cc,region:REGIONS[cc]||'Unknown',valid:String(valid)}}/></div>
      <div className="summary-strip">
        <div className="sstat"><div className={`sstat-num ${valid?'green':'red'}`}>{valid?'✓':'✗'}</div><div className="sstat-label">Valid</div></div>
        <div className="sstat"><div className="sstat-num blue sm">+{cc}</div><div className="sstat-label">Code</div></div>
        <div className="sstat"><div className="sstat-num">{digits.length}</div><div className="sstat-label">Digits</div></div>
      </div>
      <Card title="Number Analysis">
        <KV label="Normalized" value={clean}/><KV label="Digits" value={digits}/>
        <KV label="Country code" value={`+${cc}`}/><KV label="Region" value={REGIONS[cc]||'Unknown'}/>
        <KV label="Valid" value={<Pill color={valid?'green':'red'}>{valid?'VALID FORMAT':'INVALID'}</Pill>}/>
      </Card>
      <Card title="Lookup Resources">
        <KV label="Truecaller" value={<a href={`https://www.truecaller.com/search/us/${digits}`} target="_blank" rel="noopener noreferrer">Truecaller ↗</a>}/>
        <KV label="WhoCalledUs" value={<a href={`https://whocalledus.com/numbers/${digits}`} target="_blank" rel="noopener noreferrer">WhoCalledUs ↗</a>}/>
        <KV label="800Notes" value={<a href={`https://800notes.com/Phone.aspx/${digits}`} target="_blank" rel="noopener noreferrer">800Notes ↗</a>}/>
        <KV label="WhatsApp" value={<a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">Click-to-chat ↗</a>}/>
        <KV label="Telegram" value={<a href={`https://t.me/${digits}`} target="_blank" rel="noopener noreferrer">Telegram ↗</a>}/>
      </Card>
    </div>
  );
}

// ─── IP ───────────────────────────────────────────────────────────────────────
function IPPanel({ query }) {
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    setLoading(true); setRes(null); setErr('');
    const url = query?.trim()?`https://ipapi.co/${encodeURIComponent(query.trim())}/json/`:'https://ipapi.co/json/';
    fetch(url).then(r=>r.json()).then(async d => {
      if(d.error) throw new Error(d.reason||'Invalid IP');
      let rdns='—';
      try { const r=await fetch(`https://dns.google/resolve?name=${d.ip}&type=PTR`).then(r=>r.json()); rdns=r.Answer?.[0]?.data||'—'; } catch {}
      const isProxy=!!(d.org&&/vpn|proxy|tor|hosting|cloud|aws|azure|gcp|digitalocean|linode|vultr|ovh|hetzner/i.test(d.org));
      setRes({...d,rdns,isProxy}); setLoading(false);
    }).catch(e=>{setErr(e.message);setLoading(false);});
  }, [query]);
  if(loading) return <Spinner label="Fetching IP intelligence..."/>;
  if(err) return <div style={{color:'var(--red)',fontSize:12,padding:'20px 0',fontFamily:'var(--mono)'}}>Error: {err}</div>;
  if(!res) return null;
  return (
    <div>
      <div className="result-header"><div className="result-title">IP: <span>{res.ip}</span></div><Exports obj={{ip:res.ip,country:res.country_name||'',city:res.city||'',asn:res.asn||'',org:res.org||'',lat:String(res.latitude),lng:String(res.longitude)}}/></div>
      <div className="summary-strip">
        <div className="sstat"><div className="sstat-num blue sm">{res.country_code||'—'}</div><div className="sstat-label">Country</div></div>
        <div className="sstat"><div className="sstat-num sm">{(res.city||'—').slice(0,10)}</div><div className="sstat-label">City</div></div>
        <div className="sstat"><div className={`sstat-num ${res.isProxy?'yellow':'green'} sm`}>{res.isProxy?'PROXY':'CLEAN'}</div><div className="sstat-label">Risk</div></div>
      </div>
      <Card title="Geolocation">
        <KV label="IP" value={res.ip}/><KV label="Version" value={res.version}/>
        <KV label="Country" value={`${res.country_name} (${res.country_code})`}/>
        <KV label="Region" value={res.region||'—'}/><KV label="City" value={res.city||'—'}/>
        <KV label="Coordinates" value={`${res.latitude}, ${res.longitude}`}/>
        <KV label="Timezone" value={`${res.timezone} (${res.utc_offset})`}/>
      </Card>
      <Card title="Network">
        <KV label="ASN" value={res.asn||'—'}/><KV label="Organization" value={res.org||'—'}/>
        <KV label="Network" value={res.network||'—'}/><KV label="Reverse DNS" value={res.rdns}/>
        <KV label="Proxy/VPN" value={<Pill color={res.isProxy?'yellow':'green'}>{res.isProxy?'LIKELY PROXY':'CLEAN'}</Pill>}/>
      </Card>
      <Card title="Tools">
        <KV label="Google Maps" value={<a href={`https://www.google.com/maps?q=${res.latitude},${res.longitude}`} target="_blank" rel="noopener noreferrer">View location ↗</a>}/>
        <KV label="Shodan" value={<a href={`https://www.shodan.io/host/${res.ip}`} target="_blank" rel="noopener noreferrer">Shodan ↗</a>}/>
        <KV label="GreyNoise" value={<a href={`https://viz.greynoise.io/ip/${res.ip}`} target="_blank" rel="noopener noreferrer">GreyNoise ↗</a>}/>
        <KV label="Currency" value={`${res.currency} — ${res.currency_name}`}/>
        <KV label="Languages" value={res.languages}/>
      </Card>
    </div>
  );
}

// ─── DOMAIN + BREACH DATA ─────────────────────────────────────────────────────
function DomainPanel({ query }) {
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!query) { setRes(null); return; }
    const domain = query.trim().replace(/^https?:\/\//,'').split('/')[0];
    setLoading(true); setRes(null);
    const types = ['A','AAAA','MX','NS','TXT','CNAME','CAA'];
    const dns = {};
    Promise.all([
      ...types.map(t => fetch(`https://dns.google/resolve?name=${domain}&type=${t}`).then(r=>r.json()).then(d=>{dns[t]=d.Answer||[];}).catch(()=>{dns[t]=[];})),
      fetch(`https://dns.google/resolve?name=_dmarc.${domain}&type=TXT`).then(r=>r.json()).then(d=>{dns._dmarc=d.Answer||[];}).catch(()=>{dns._dmarc=[];}),
    ]).then(async () => {
      const txts=(dns.TXT||[]).map(t=>t.data);
      const hasSPF=txts.some(t=>t.includes('v=spf1'));
      const hasDMARC=(dns._dmarc||[]).some(t=>t.data&&t.data.includes('v=DMARC1'));
      const hasCAA=(dns.CAA||[]).length>0;
      const ip=dns.A?.[0]?.data;
      let geo=null;
      if(ip){try{geo=await fetch(`https://ipapi.co/${ip}/json/`).then(r=>r.json());if(geo.error)geo=null;}catch{}}
      // Breach intel — curated known-breach domains for demo; in prod hook up HIBP domain API
      const KNOWN_BREACHES = {
        'adobe.com': [{name:'Adobe 2013',records:'152M',data:'Emails, encrypted passwords',date:'Oct 2013'}],
        'linkedin.com': [{name:'LinkedIn 2012',records:'164M',data:'Emails, hashed passwords',date:'Jun 2012'},{name:'LinkedIn 2021',records:'700M',data:'Emails, phone numbers, addresses',date:'Jun 2021'}],
        'yahoo.com': [{name:'Yahoo 2013',records:'3B',data:'Emails, passwords, security Q&As',date:'Aug 2013'},{name:'Yahoo 2014',records:'500M',data:'Emails, passwords, DOBs',date:'Dec 2016'}],
        'myspace.com': [{name:'MySpace 2013',records:'360M',data:'Emails, passwords, usernames',date:'Jun 2013'}],
        'twitter.com': [{name:'Twitter 2022',records:'5.4M',data:'Emails, phone numbers, profile data',date:'Jul 2022'}],
        'x.com': [{name:'Twitter/X 2022',records:'5.4M',data:'Emails, phone numbers',date:'Jul 2022'}],
        'dropbox.com': [{name:'Dropbox 2012',records:'68M',data:'Emails, hashed passwords',date:'Aug 2012'}],
        'ebay.com': [{name:'eBay 2014',records:'145M',data:'Emails, passwords, addresses, DOBs',date:'May 2014'}],
        'tumblr.com': [{name:'Tumblr 2013',records:'65M',data:'Emails, hashed passwords',date:'May 2013'}],
        'snapchat.com': [{name:'Snapchat 2014',records:'4.6M',data:'Usernames, partial phone numbers',date:'Jan 2014'}],
        'canva.com': [{name:'Canva 2019',records:'137M',data:'Emails, usernames, bcrypt passwords',date:'May 2019'}],
      };
      const breaches = KNOWN_BREACHES[domain.toLowerCase()] || [];
      setRes({domain,dns,txts,hasSPF,hasDMARC,hasCAA,ip,geo,breaches});
      setLoading(false);
    });
  }, [query]);
  if(!query) return <Empty icon={<><rect x="2" y="10" width="36" height="22" rx="2"/><path d="M2 18h36M10 10v22M30 10v22"/></>} text="Enter a domain name to inspect"/>;
  if(loading) return <Spinner label="Enumerating DNS records..."/>;
  if(!res) return null;
  const DR = (type) => (res.dns[type]||[]).map((r,i)=><DNSRow key={i} type={type} value={r.data}/>);
  return (
    <div>
      <div className="result-header"><div className="result-title">Domain: <span>{res.domain}</span></div><Exports obj={{domain:res.domain,ip:res.ip||'—',spf:String(res.hasSPF),dmarc:String(res.hasDMARC),breaches:String(res.breaches.length)}}/></div>
      <div className="summary-strip">
        <div className="sstat"><div className={`sstat-num ${res.dns.A.length?'green':'red'} sm`}>{res.dns.A.length?'UP':'DOWN'}</div><div className="sstat-label">Resolves</div></div>
        <div className="sstat"><div className={`sstat-num ${res.hasSPF?'green':'red'}`}>{res.hasSPF?'✓':'✗'}</div><div className="sstat-label">SPF</div></div>
        <div className="sstat"><div className={`sstat-num ${res.hasDMARC?'green':'red'}`}>{res.hasDMARC?'✓':'✗'}</div><div className="sstat-label">DMARC</div></div>
        <div className="sstat"><div className={`sstat-num ${res.breaches.length?'red':'green'} sm`}>{res.breaches.length?res.breaches.length+' BREACH':'CLEAN'}</div><div className="sstat-label">Breaches</div></div>
      </div>

      {/* BREACH DATA */}
      {res.breaches.length > 0 && (
        <Card title="⚠ Data Breaches">
          {res.breaches.map((b,i) => (
            <div key={i} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderLeft:'3px solid var(--red)',borderRadius:6,padding:'10px 12px',marginBottom:8}}>
              <div style={{fontFamily:'var(--sans)',fontWeight:600,fontSize:13,color:'var(--text)',marginBottom:3}}>{b.name}</div>
              <div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--text2)'}}>{b.records} records · {b.data}</div>
              <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text3)',marginTop:3}}>Leaked: {b.date}</div>
            </div>
          ))}
          <div style={{marginTop:10}}>
            <KV label="Full breach DB" value={<a href={`https://haveibeenpwned.com/DomainSearch`} target="_blank" rel="noopener noreferrer">HIBP Domain Search ↗</a>}/>
            <KV label="IntelX" value={<a href={`https://intelx.io/?s=${encodeURIComponent(res.domain)}`} target="_blank" rel="noopener noreferrer">Search IntelX ↗</a>}/>
          </div>
        </Card>
      )}
      {res.breaches.length === 0 && (
        <Card title="Data Breaches">
          <div style={{fontSize:12,color:'var(--green)',fontFamily:'var(--mono)',padding:'8px 0'}}>No known breaches found in local database.</div>
          <KV label="HIBP Domain Search" value={<a href="https://haveibeenpwned.com/DomainSearch" target="_blank" rel="noopener noreferrer">Check manually ↗</a>}/>
          <KV label="DeHashed" value={<a href={`https://dehashed.com/search?query=${encodeURIComponent(res.domain)}`} target="_blank" rel="noopener noreferrer">Search DeHashed ↗</a>}/>
        </Card>
      )}

      {(res.dns.A.length||res.dns.AAAA.length||res.dns.CNAME.length)?<Card title="Host Records">{DR('A')}{DR('AAAA')}{DR('CNAME')}</Card>:null}
      {res.dns.MX?.length?<Card title="Mail Servers">{DR('MX')}</Card>:null}
      {res.dns.NS?.length?<Card title="Nameservers">{DR('NS')}</Card>:null}
      <Card title="Email Security">
        <KV label="SPF" value={<Pill color={res.hasSPF?'green':'red'}>{res.hasSPF?'CONFIGURED':'MISSING'}</Pill>}/>
        <KV label="DMARC" value={<Pill color={res.hasDMARC?'green':'red'}>{res.hasDMARC?'CONFIGURED':'MISSING'}</Pill>}/>
        <KV label="CAA" value={<Pill color={res.hasCAA?'green':'yellow'}>{res.hasCAA?'PRESENT':'ABSENT'}</Pill>}/>
      </Card>
      {res.geo&&<Card title={`Server Location (${res.ip})`}><KV label="Country" value={`${res.geo.country_name} (${res.geo.country_code})`}/><KV label="City" value={res.geo.city||'—'}/><KV label="ISP" value={res.geo.org||'—'}/><KV label="ASN" value={res.geo.asn||'—'}/></Card>}
      {res.txts.length>0&&<Card title="TXT Records">{res.txts.map((t,i)=><DNSRow key={i} type="TXT" value={t} small/>)}</Card>}
      <Card title="External Tools">
        <KV label="Shodan" value={<a href={`https://www.shodan.io/search?query=${res.domain}`} target="_blank" rel="noopener noreferrer">Shodan ↗</a>}/>
        <KV label="VirusTotal" value={<a href={`https://www.virustotal.com/gui/domain/${res.domain}`} target="_blank" rel="noopener noreferrer">VirusTotal ↗</a>}/>
        <KV label="SecurityTrails" value={<a href={`https://securitytrails.com/domain/${res.domain}/dns`} target="_blank" rel="noopener noreferrer">SecurityTrails ↗</a>}/>
        <KV label="Wayback" value={<a href={`https://web.archive.org/web/*/${res.domain}`} target="_blank" rel="noopener noreferrer">Archive.org ↗</a>}/>
        <KV label="crt.sh" value={<a href={`https://crt.sh/?q=${res.domain}`} target="_blank" rel="noopener noreferrer">Cert Transparency ↗</a>}/>
      </Card>
    </div>
  );
}

// ─── DISCORD ──────────────────────────────────────────────────────────────────
function DiscordPanel({ query }) {
  if(!query) return <Empty icon={<path d="M16 28s-2 2.5-6 3c1-1.5 2-3 2-5a14 14 0 1 1 8 2z"/>} text="Enter a Discord User ID (17–19 digits)"/>;
  const clean=query.trim().replace(/\D/g,'');
  const valid=/^\d{17,19}$/.test(clean);
  let created='—',year='—',workerId='—',processId='—';
  if(valid){try{const sf=BigInt(clean);const ms=Number(sf>>22n)+1420070400000;created=new Date(ms).toUTCString();year=String(new Date(ms).getFullYear());workerId=String(Number((sf>>17n)&0x1Fn));processId=String(Number((sf>>12n)&0x1Fn));}catch{}}
  return (
    <div>
      <div className="result-header"><div className="result-title">Discord ID: <span>{clean}</span></div></div>
      <div className="summary-strip">
        <div className="sstat"><div className={`sstat-num ${valid?'green':'red'}`}>{valid?'✓':'✗'}</div><div className="sstat-label">Valid</div></div>
        <div className="sstat"><div className="sstat-num blue sm">{year}</div><div className="sstat-label">Year</div></div>
      </div>
      <Card title="Snowflake Decode">
        <KV label="Discord ID" value={clean}/>
        <KV label="Valid" value={<Pill color={valid?'green':'red'}>{valid?'YES (17–19 digits)':'INVALID'}</Pill>}/>
        <KV label="Account created" value={created}/>
        {valid&&<><KV label="Worker ID" value={workerId}/><KV label="Process ID" value={processId}/></>}
      </Card>
      <Card title="Lookup Resources">
        <KV label="Profile" value={<a href={`https://discord.com/users/${clean}`} target="_blank" rel="noopener noreferrer">discord.com/users/{clean} ↗</a>}/>
        <KV label="Discord.id" value={<a href={`https://discord.id/?prefill=${clean}`} target="_blank" rel="noopener noreferrer">discord.id ↗</a>}/>
        <KV label="DiscordLookup" value={<a href={`https://discordlookup.com/user/${clean}`} target="_blank" rel="noopener noreferrer">discordlookup.com ↗</a>}/>
      </Card>
    </div>
  );
}

// ─── AI ANALYST ───────────────────────────────────────────────────────────────
function AIPanel({ query, session }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [res, setRes] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { if(query) setPrompt(query); }, [query]);
  if(!session) return (
    <div style={{textAlign:'center',padding:'40px 20px'}}>
      <div style={{fontSize:32,marginBottom:12}}>🔒</div>
      <div style={{fontFamily:'var(--sans)',fontWeight:600,fontSize:16,color:'var(--text)',marginBottom:8}}>Sign in to use AI Analyst</div>
      <div style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--text2)',marginBottom:20}}>AI analysis is available to free account holders and above.</div>
      <button className="land-btn-primary" onClick={()=>router.push('/auth?tab=register')}>Create free account</button>
    </div>
  );
  const run = async () => {
    if(!prompt.trim()) return;
    setLoading(true); setRes(''); setErr('');
    try {
      const data = await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:prompt})}).then(r=>r.json());
      if(data.error) throw new Error(data.error);
      setRes(data.result);
    } catch(e){setErr(e.message);}
    setLoading(false);
  };
  const fmt = res.replace(/^([A-Z][A-Z\s]+:)/gm,'<span class="ai-section">$1</span>').replace(/\n/g,'<br>');
  return (
    <div>
      <div className="result-header"><div className="result-title">AI <span>Analyst</span></div></div>
      <Card title="Intelligence Request">
        <textarea style={{width:'100%',minHeight:90,resize:'vertical',marginBottom:10,background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:6,padding:'10px 12px',fontSize:12,fontFamily:'var(--mono)',color:'var(--text)',outline:'none'}}
          placeholder="Describe your target, paste findings, or ask an OSINT methodology question... (Ctrl+Enter to run)"
          value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&e.ctrlKey&&run()}/>
        <button className="go-btn" onClick={run} disabled={loading} style={{width:'100%'}}>{loading?'Analyzing...':'Run Analysis'}</button>
      </Card>
      {loading&&<Spinner label="AI analyst processing..."/>}
      {err&&<div style={{color:'var(--red)',fontSize:12,fontFamily:'var(--mono)',padding:'12px 0'}}>Error: {err}</div>}
      {res&&<Card title="Analysis Output"><div className="ai-output" dangerouslySetInnerHTML={{__html:fmt}}/></Card>}
      {!res&&!loading&&<Empty icon={<><circle cx="20" cy="20" r="16"/><path d="M20 12v8l5 3"/></>} text="Powered by Claude" sub="Describe a target or paste collected findings"/>}
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
const MODS = [
  {id:'username',label:'Username',ph:'Enter username to scan 50+ platforms...'},
  {id:'email',label:'Email',ph:'Enter email address...'},
  {id:'phone',label:'Phone',ph:'Enter phone number (+1 555 000 0000)...'},
  {id:'ip',label:'IP Address',ph:'Enter IP or leave blank for your IP...'},
  {id:'domain',label:'Domain',ph:'Enter domain name (example.com)...'},
  {id:'discord',label:'Discord',ph:'Enter Discord User ID (17–19 digits)...'},
  {id:'ai',label:'AI Analyst',ph:'Describe target or paste intel...'},
];

const SIDEBARS = ['username','email','phone','ip','domain','discord'];

function Icon({id}) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
      {id==='username'&&<path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z"/>}
      {id==='email'&&<><rect x="1" y="4" width="14" height="10" rx="1" stroke="currentColor" fill="none" strokeWidth="1.2"/><path d="M1 6l7 5 7-5" stroke="currentColor" fill="none" strokeWidth="1.2"/></>}
      {id==='phone'&&<path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zm4 10a.5.5 0 100 1 .5.5 0 000-1z"/>}
      {id==='ip'&&<><circle cx="8" cy="8" r="6" stroke="currentColor" fill="none" strokeWidth="1.2"/><path d="M8 2v12M2 8h12" stroke="currentColor" fill="none" strokeWidth="1.2"/></>}
      {id==='domain'&&<><rect x="1" y="4" width="14" height="9" rx="1" stroke="currentColor" fill="none" strokeWidth="1.2"/><path d="M1 8h14" stroke="currentColor" fill="none" strokeWidth="1.2"/></>}
      {id==='discord'&&<path d="M13.5 2A1.5 1.5 0 0115 3.5v9.25a1.5 1.5 0 01-1.5 1.5H3.75l-.5-1.5L2 14.5V3.5A1.5 1.5 0 013.5 2h10zm-7 5.5a1 1 0 100 2 1 1 0 000-2zm3 0a1 1 0 100 2 1 1 0 000-2z"/>}
      {id==='ai'&&<path d="M8 1a7 7 0 110 14A7 7 0 018 1zm0 3a1 1 0 00-1 1v3a1 1 0 002 0V5a1 1 0 00-1-1zm0 7a1 1 0 100 2 1 1 0 000-2z"/>}
    </svg>
  );
}

export default function Dashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [mod, setMod] = useState('username');
  const [input, setInput] = useState('');
  const [committed, setCommitted] = useState({ mod:'username', query:'', key:0 });
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [usageCount, setUsageCount] = useState(null);

  const switchMod = (id) => { setMod(id); setInput(''); setRateLimitInfo(null); setCommitted({mod:id,query:'',key:0}); };

  const search = async () => {
    const q = input.trim();
    if (!q && mod !== 'ip') return;
    setRateLimitInfo(null);
    // Check rate limit
    const check = await gate(mod, q || 'self', session, router);
    if (check.blocked) { setRateLimitInfo(check); return; }
    setUsageCount({ count: check.count, limit: check.limit });
    setCommitted({ mod, query: q, key: committed.key + 1 });
  };

  const plan = session?.user?.plan || 'guest';
  const limit = { guest:5, free:20, pro:200, unlimited:'∞' }[plan] || 20;

  const renderPanel = () => {
    const q = committed.mod === mod ? committed.query : '';
    const k = `${mod}-${committed.key}`;
    switch(mod) {
      case 'username': return <UsernamePanel key={k} query={q}/>;
      case 'email':    return <EmailPanel    key={k} query={q}/>;
      case 'phone':    return <PhonePanel    key={k} query={q}/>;
      case 'ip':       return <IPPanel       key={k} query={q}/>;
      case 'domain':   return <DomainPanel   key={k} query={q}/>;
      case 'discord':  return <DiscordPanel  key={k} query={q}/>;
      case 'ai':       return <AIPanel       key={k} query={q} session={session}/>;
      default: return null;
    }
  };

  return (
    <div className="app">
      {/* HEADER */}
      <header className="hdr">
        <div className="hdr-left">
          <div className="land-logo" style={{cursor:'pointer',gap:8}} onClick={()=>router.push('/')}>
            <div className="logo-mark"><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" fill="var(--bg)"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="var(--bg)" strokeWidth="1.2"/></svg></div>
            <span className="logo-name">CLOUD<span>SINT</span></span>
          </div>
          <span className="logo-tag">v2.0</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {usageCount && (
            <div style={{fontSize:10,color:'var(--text3)',fontFamily:'var(--mono)'}}>
              {usageCount.count}/{usageCount.limit === Infinity ? '∞' : usageCount.limit} today
            </div>
          )}
          {session ? (
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{fontSize:11,color:'var(--text2)',fontFamily:'var(--mono)'}}>
                {session.user.email?.split('@')[0]}
                <span style={{marginLeft:6,background:'var(--adim2)',color:'var(--accent)',border:'1px solid rgba(0,212,255,0.25)',borderRadius:10,padding:'1px 6px',fontSize:9}}>{plan.toUpperCase()}</span>
              </div>
              <button style={{fontSize:10,color:'var(--text3)',fontFamily:'var(--mono)',background:'transparent',border:'1px solid var(--border)',borderRadius:4,padding:'3px 8px',cursor:'pointer'}} onClick={()=>signOut({callbackUrl:'/'})}>Sign out</button>
              {plan==='free'&&<button className="land-btn-sm" style={{fontSize:10,padding:'4px 10px'}} onClick={()=>router.push('/pricing')}>Upgrade</button>}
            </div>
          ) : (
            <div style={{display:'flex',gap:8}}>
              <button className="land-btn-ghost" onClick={()=>router.push('/auth')} style={{fontSize:11,padding:'5px 12px'}}>Sign in</button>
              <button className="land-btn-sm" onClick={()=>router.push('/auth?tab=register')} style={{fontSize:11,padding:'5px 12px'}}>Sign up free</button>
            </div>
          )}
          <div className="hdr-status"><div className="status-dot"/><span>Online</span></div>
        </div>
      </header>

      {/* SEARCH */}
      <div className="search-zone">
        <div className="type-row">
          {MODS.map(m=>(
            <button key={m.id} className={`type-btn${mod===m.id?' active':''}`} onClick={()=>switchMod(m.id)}>{m.label}</button>
          ))}
        </div>
        <div className="search-row">
          <input className="search-input" placeholder={MODS.find(m=>m.id===mod)?.ph} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()}/>
          <button className="go-btn" onClick={search}>SEARCH</button>
        </div>
        {!session && (
          <div style={{fontSize:10,color:'var(--text3)',fontFamily:'var(--mono)',marginTop:8}}>
            Guest: 5 lookups total · <button style={{color:'var(--accent)',background:'none',border:'none',cursor:'pointer',fontSize:10,fontFamily:'var(--mono)'}} onClick={()=>router.push('/auth?tab=register')}>Sign up for 20/day free</button>
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="main">
        <nav className="sidebar">
          <div className="sidebar-section">Modules</div>
          {SIDEBARS.map(id=>(
            <div key={id} className={`sidebar-item${mod===id?' active':''}`} onClick={()=>switchMod(id)}>
              <Icon id={id}/>{MODS.find(m=>m.id===id)?.label}
            </div>
          ))}
          <div className="sidebar-divider"/>
          <div className="sidebar-section">Intelligence</div>
          <div className={`sidebar-item${mod==='ai'?' active':''}`} onClick={()=>switchMod('ai')}>
            <Icon id="ai"/>AI Analyst
          </div>
          <div className="sidebar-divider"/>
          <div className="sidebar-section">Account</div>
          {session ? (
            <>
              <div className="sidebar-item" onClick={()=>router.push('/pricing')} style={{color:'var(--accent)'}}>
                <Icon id="ai"/>Upgrade plan
              </div>
            </>
          ) : (
            <div className="sidebar-item" onClick={()=>router.push('/auth')}>
              <Icon id="ai"/>Sign in / Register
            </div>
          )}
        </nav>

        <main className="content">
          <div className="content-inner">
            {rateLimitInfo ? (
              <RateLimitWall info={rateLimitInfo} onDismiss={()=>setRateLimitInfo(null)} router={router}/>
            ) : renderPanel()}
          </div>
        </main>
      </div>
    </div>
  );
}
