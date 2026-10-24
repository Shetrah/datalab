import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, ShieldCheck } from 'lucide-react';
import { getSiteContent, getStaffRole, saveSiteContent, supabase, supabaseConfigured } from '../lib/supabase';

const sections = [
  { key: 'home', label: 'Home page', fields: [['heroTitle', 'Hero heading'], ['heroDescription', 'Hero introduction']] },
  { key: 'contact', label: 'Contact page', fields: [['intro', 'Introduction']] },
  { key: 'about', label: 'About page', fields: [['title', 'Page heading'], ['intro', 'Introduction']] },
];
type Draft = Record<string, Record<string, string>>;
const defaults: Draft = {
  home: { heroTitle: 'Turn your data into actionable insight.', heroDescription: 'Research and data consulting for scholars, organisations and teams who need evidence they can trust — and findings they can put to work.' },
  contact: { intro: "Share what you are working on and what you need to understand. We'll use your brief to plan a practical next step.", consultationLabel: 'Book a consultation' },
  about: { title: 'Turning data into actionable insights.', intro: 'Practical research design, data analysis and insight for academic researchers and organisations.' },
};

export default function Admin() {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(defaults);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (data.session?.user) setRole(await getStaffRole(data.session.user.id));
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) setRole(null);
      else getStaffRole(next.user.id).then(setRole).catch(() => setRole(null));
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!session || !role) return;
    Promise.all(sections.map(async (section) => [section.key, await getSiteContent(section.key)] as const))
      .then((rows) => setDraft((current) => Object.fromEntries(rows.map(([key, value]) => [key, { ...defaults[key], ...current[key], ...value }]))))
      .catch(() => setMessage('Could not load saved content.'));
  }, [session, role]);
  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMessage('');
    const data = new FormData(e.currentTarget);
    const { error } = await supabase!.auth.signInWithPassword({ email: String(data.get('email')), password: String(data.get('password')) });
    if (error) setMessage('Sign-in failed. Check your staff account details.');
  }
  async function save(key: string) {
    if (!session?.user || !role) return;
    try { await saveSiteContent(key, draft[key] || {}, session.user.id); setMessage(`${sections.find((section) => section.key === key)?.label} saved.`); }
    catch { setMessage('Could not save. Check Supabase setup and staff permissions.'); }
  }
  return <main className="admin-shell"><div className="admin-head"><Link to="/" className="text-link"><ArrowLeft size={16}/> Back to website</Link><span className="admin-badge"><ShieldCheck size={16}/> Staff portal</span></div><h1>Website content</h1><p className="admin-lead">Edit text by page. Saved updates appear on the matching public page.</p>
    {!supabaseConfigured && <div className="admin-notice" role="status">Admin portal is not connected. Add Supabase URL and anon key, apply the SQL schema, and assign your staff account a role.</div>}
    {loading && <p>Checking staff access…</p>}
    {supabaseConfigured && !loading && !session && <form className="contact-form admin-login" onSubmit={signIn}><h2>Staff sign in</h2><p>Use a staff account created in Supabase Authentication.</p>{message&&<div className="error-msg" role="alert">{message}</div>}<label>Email<input name="email" type="email" autoComplete="username" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label><button className="btn btn-primary full-btn">Sign in</button></form>}
    {session && !role && <div className="admin-notice" role="alert">Signed in, but this account has no editor or admin role. Assign one in the <code>staff_roles</code> table.</div>}
    {session && role && <><div className="admin-session">Signed in as {session.user.email} · {role}<button className="btn btn-outline-dark" onClick={() => supabase?.auth.signOut()}>Sign out</button></div>{message&&<div className="success-msg" role="status">{message}</div>}<div className="admin-sections">{sections.map((section)=><section className="contact-form admin-section" key={section.key}><h2>{section.label}</h2>{section.fields.map(([field,label])=><label key={field}>{label}<textarea rows={field.toLowerCase().includes('description')||field==='intro'?4:2} value={draft[section.key]?.[field]||''} onChange={e=>setDraft({...draft,[section.key]:{...draft[section.key],[field]:e.target.value}})}/></label>)}<button className="btn btn-primary" onClick={()=>save(section.key)}><Save size={16}/> Save {section.label}</button></section>)}</div></>}
  </main>;
}
