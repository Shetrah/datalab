import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Save, ShieldCheck, Inbox, FolderKanban, Settings, 
  Search, Filter, ChevronDown, ChevronUp, Eye, Edit, CheckCircle, 
  XCircle, Clock, AlertCircle, DollarSign, FileText, TrendingUp,
  Users, Package, MessageSquare
} from 'lucide-react';
import {
  getSiteContent, getStaffRole, saveSiteContent, supabase,
  supabaseConfigured, getAllEnquiries, getAllProjects, getAllContacts,
  getAllProjectSubmissions, convertSubmissionToProject, type Enquiry, type Project, type Contact,
  type ProjectSubmission
} from '../lib/supabase';

type TabType = 'submissions' | 'enquiries' | 'contacts' | 'projects' | 'content' | 'analytics';

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

const statusColors: Record<string, string> = {
  new: '#3b82f6',
  reviewing: '#f59e0b',
  quoted: '#8b5cf6',
  accepted: '#10b981',
  declined: '#ef4444',
  converted: '#06b6d4',
  awaiting_deposit: '#f59e0b',
  deposit_confirmed: '#8b5cf6',
  in_progress: '#3b82f6',
  awaiting_draft_review: '#f59e0b',
  revision_requested: '#f97316',
  draft_approved: '#10b981',
  awaiting_balance_payment: '#f59e0b',
  payment_verification_pending: '#8b5cf6',
  final_deliverables_available: '#10b981',
  completed: '#22c55e',
  on_hold: '#6b7280',
  cancelled: '#ef4444'
};

const statusLabels: Record<string, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  quoted: 'Quoted',
  accepted: 'Accepted',
  declined: 'Declined',
  converted: 'Converted',
  awaiting_deposit: 'Awaiting Deposit',
  deposit_confirmed: 'Deposit Confirmed',
  in_progress: 'In Progress',
  awaiting_draft_review: 'Awaiting Review',
  revision_requested: 'Revision Requested',
  draft_approved: 'Draft Approved',
  awaiting_balance_payment: 'Awaiting Balance',
  payment_verification_pending: 'Payment Pending',
  final_deliverables_available: 'Deliverables Ready',
  completed: 'Completed',
  on_hold: 'On Hold',
  cancelled: 'Cancelled'
};

export default function Admin() {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('submissions');
  const [draft, setDraft] = useState<Draft>(defaults);
  const [message, setMessage] = useState('');
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

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
    loadData();
  }, [session, role]);

  async function loadData() {
    try {
      const [enquiriesData, projectsData, contactsData, submissionsData, contentData] = await Promise.all([
        getAllEnquiries().catch(() => []),
        getAllProjects().catch(() => []),
        getAllContacts().catch(() => []),
        getAllProjectSubmissions().catch(() => []),
        Promise.all(sections.map(async (section) => [section.key, await getSiteContent(section.key).catch(() => null)] as const))
      ]);
      setEnquiries(enquiriesData);
      setProjects(projectsData);
      setContacts(contactsData);
      setSubmissions(submissionsData);
      setDraft((current) => Object.fromEntries(contentData.map(([key, value]) => [key, { ...defaults[key], ...current[key], ...value }])));
      setMessage(''); // Clear any previous errors
    } catch (error) {
      console.error('Load error:', error);
      setMessage('Could not load data. Check permissions.');
    }
  }

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    const data = new FormData(e.currentTarget);
    const { error } = await supabase!.auth.signInWithPassword({ 
      email: String(data.get('email')), 
      password: String(data.get('password')) 
    });
    if (error) setMessage('Sign-in failed. Check your staff account details.');
  }

  async function save(key: string) {
    if (!session?.user || !role) return;
    try {
      await saveSiteContent(key, draft[key] || {}, session.user.id);
      setMessage(`${sections.find((section) => section.key === key)?.label} saved.`);
    } catch {
      setMessage('Could not save. Check Supabase setup and staff permissions.');
    }
  }

  const filteredEnquiries = enquiries.filter(e => 
    (filterStatus === 'all' || e.status === filterStatus) &&
    (searchTerm === '' || 
      e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.project_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.reference.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const filteredProjects = projects.filter(p => 
    (filterStatus === 'all' || p.status === filterStatus) &&
    (searchTerm === '' || 
      p.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.reference.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const stats = {
    totalSubmissions: submissions.length,
    newSubmissions: submissions.filter(s => s.status === 'new').length,
    totalEnquiries: enquiries.length,
    newEnquiries: enquiries.filter(e => e.status === 'new').length,
    totalContacts: contacts.length,
    newContacts: contacts.filter(c => c.status === 'new').length,
    activeProjects: projects.filter(p => p.status === 'in_progress').length,
    totalProjects: projects.length,
    totalRevenue: projects.reduce((sum, p) => sum + (p.total_fee || 0), 0),
    pendingPayments: projects.filter(p => !p.deposit_paid || !p.balance_paid).length
  };

  return (
    <main className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-header-content">
          <div>
            <Link to="/" className="text-link"><ArrowLeft size={16}/> Back to website</Link>
            <h1><ShieldCheck size={24}/> Admin Dashboard</h1>
            <p>Manage enquiries, projects, and system settings</p>
          </div>
          {session && (
            <div className="admin-user-info">
              <div>
                <strong>{session.user.email}</strong>
                <span className="admin-role-badge">{role}</span>
              </div>
              <button className="btn btn-outline-dark btn-sm" onClick={() => supabase?.auth.signOut()}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {!supabaseConfigured && (
        <div className="admin-notice admin-notice-warning" role="status">
          <AlertCircle size={20}/>
          Admin portal is not connected. Add Supabase URL and anon key, apply the SQL schema, and assign your staff account a role.
        </div>
      )}

      {loading && <div className="admin-loading"><Clock size={24}/> Checking staff access…</div>}

      {supabaseConfigured && !loading && !session && (
        <div className="admin-login-wrapper">
          <form className="admin-login-form" onSubmit={signIn}>
            <ShieldCheck size={48} className="login-icon"/>
            <h2>Staff Sign In</h2>
            <p>Use a staff account created in Supabase Authentication.</p>
            {message && <div className="error-msg" role="alert">{message}</div>}
            <label>
              Email
              <input name="email" type="email" autoComplete="username" required/>
            </label>
            <label>
              Password
              <input name="password" type="password" autoComplete="current-password" required/>
            </label>
            <button className="btn btn-primary full-btn">Sign in</button>
          </form>
        </div>
      )}

      {session && !role && (
        <div className="admin-notice admin-notice-error" role="alert">
          <XCircle size={20}/>
          Signed in, but this account has no editor or admin role. Assign one in the <code>staff_roles</code> table.
        </div>
      )}

      {session && role && (
        <>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="stat-icon" style={{background: '#dbeafe', color: '#3b82f6'}}>
                <Package size={24}/>
              </div>
              <div>
                <div className="stat-value">{stats.newSubmissions}</div>
                <div className="stat-label">New Submissions</div>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="stat-icon" style={{background: '#fef3c7', color: '#f59e0b'}}>
                <FolderKanban size={24}/>
              </div>
              <div>
                <div className="stat-value">{stats.activeProjects}</div>
                <div className="stat-label">Active Projects</div>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="stat-icon" style={{background: '#d1fae5', color: '#10b981'}}>
                <TrendingUp size={24}/>
              </div>
              <div>
                <div className="stat-value">KES {(stats.totalRevenue / 1000).toFixed(0)}K</div>
                <div className="stat-label">Total Revenue</div>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="stat-icon" style={{background: '#fee2e2', color: '#ef4444'}}>
                <DollarSign size={24}/>
              </div>
              <div>
                <div className="stat-value">{stats.pendingPayments}</div>
                <div className="stat-label">Pending Payments</div>
              </div>
            </div>
          </div>

          {message && <div className="success-msg" role="status">{message}</div>}

          <div className="admin-tabs">
            <button 
              className={activeTab === 'submissions' ? 'active' : ''} 
              onClick={() => setActiveTab('submissions')}
            >
              <Package size={18}/> Project Submissions ({stats.totalSubmissions})
            </button>
            <button 
              className={activeTab === 'contacts' ? 'active' : ''} 
              onClick={() => setActiveTab('contacts')}
            >
              <MessageSquare size={18}/> Contacts ({stats.totalContacts})
            </button>
            <button 
              className={activeTab === 'enquiries' ? 'active' : ''} 
              onClick={() => setActiveTab('enquiries')}
            >
              <Inbox size={18}/> Old Enquiries ({stats.totalEnquiries})
            </button>
            <button 
              className={activeTab === 'projects' ? 'active' : ''} 
              onClick={() => setActiveTab('projects')}
            >
              <FolderKanban size={18}/> Projects ({stats.totalProjects})
            </button>
            <button 
              className={activeTab === 'content' ? 'active' : ''} 
              onClick={() => setActiveTab('content')}
            >
              <FileText size={18}/> Website Content
            </button>
            <button 
              className={activeTab === 'analytics' ? 'active' : ''} 
              onClick={() => setActiveTab('analytics')}
            >
              <TrendingUp size={18}/> Analytics
            </button>
          </div>

          {(activeTab === 'submissions' || activeTab === 'contacts' || activeTab === 'enquiries' || activeTab === 'projects') && (
            <div className="admin-toolbar">
              <div className="admin-searchbox">
                <Search size={18}/>
                <input 
                  type="text" 
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="admin-filter">
                <Filter size={16}/>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="all">All Status</option>
                  {activeTab === 'enquiries' ? (
                    <>
                      <option value="new">New</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="quoted">Quoted</option>
                      <option value="accepted">Accepted</option>
                      <option value="declined">Declined</option>
                    </>
                  ) : (
                    <>
                      <option value="in_progress">In Progress</option>
                      <option value="awaiting_deposit">Awaiting Deposit</option>
                      <option value="awaiting_balance_payment">Awaiting Balance</option>
                      <option value="completed">Completed</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'submissions' && (
            <div className="admin-content">
              <SubmissionsTable submissions={submissions.filter(s => 
                (filterStatus === 'all' || s.status === filterStatus) &&
                (searchTerm === '' || 
                  s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.project_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.reference.toLowerCase().includes(searchTerm.toLowerCase())
                )
              )} onRefresh={loadData}/>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="admin-content">
              <ContactsTable contacts={contacts.filter(c => 
                (filterStatus === 'all' || c.status === filterStatus) &&
                (searchTerm === '' || 
                  c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (c.subject && c.subject.toLowerCase().includes(searchTerm.toLowerCase()))
                )
              )} onRefresh={loadData}/>
            </div>
          )}

          {activeTab === 'enquiries' && (
            <div className="admin-content">
              <EnquiriesTable enquiries={filteredEnquiries} onRefresh={loadData}/>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="admin-content">
              <ProjectsTable projects={filteredProjects} onRefresh={loadData}/>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="admin-content">
              <div className="admin-sections">
                {sections.map((section) => (
                  <section className="admin-section" key={section.key}>
                    <h2>{section.label}</h2>
                    {section.fields.map(([field, label]) => (
                      <label key={field}>
                        {label}
                        <textarea 
                          rows={field.toLowerCase().includes('description') || field === 'intro' ? 4 : 2} 
                          value={draft[section.key]?.[field] || ''} 
                          onChange={e => setDraft({...draft, [section.key]: {...draft[section.key], [field]: e.target.value}})}
                        />
                      </label>
                    ))}
                    <button className="btn btn-primary" onClick={() => save(section.key)}>
                      <Save size={16}/> Save {section.label}
                    </button>
                  </section>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="admin-content">
              <AnalyticsDashboard enquiries={enquiries} projects={projects}/>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function EnquiriesTable({ enquiries, onRefresh }: { enquiries: Enquiry[], onRefresh: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Client</th>
            <th>Project Title</th>
            <th>Service</th>
            <th>Budget</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {enquiries.map(enq => (
            <>
              <tr key={enq.id} className={expanded === enq.id ? 'expanded' : ''}>
                <td><strong>{enq.reference}</strong></td>
                <td>
                  <div className="client-info">
                    <div>{enq.full_name}</div>
                    <small>{enq.email}</small>
                  </div>
                </td>
                <td>{enq.project_title}</td>
                <td><span className="service-badge">{enq.service}</span></td>
                <td>{enq.budget}</td>
                <td>
                  <span className="status-badge" style={{background: statusColors[enq.status] + '20', color: statusColors[enq.status]}}>
                    {statusLabels[enq.status]}
                  </span>
                </td>
                <td>{new Date(enq.created_at).toLocaleDateString()}</td>
                <td>
                  <button 
                    className="btn-icon" 
                    onClick={() => setExpanded(expanded === enq.id ? null : enq.id)}
                    title="View details"
                  >
                    {expanded === enq.id ? <ChevronUp size={16}/> : <Eye size={16}/>}
                  </button>
                  <Link to={`/admin/enquiry/${enq.id}`} className="btn-icon" title="Edit">
                    <Edit size={16}/>
                  </Link>
                </td>
              </tr>
              {expanded === enq.id && (
                <tr className="expanded-row">
                  <td colSpan={8}>
                    <div className="expanded-content">
                      <div className="expanded-grid">
                        <div>
                          <strong>Contact Information</strong>
                          <p>Phone: {enq.phone || 'Not provided'}</p>
                          <p>Category: {enq.client_category}</p>
                          <p>Organisation: {enq.organisation || 'N/A'}</p>
                          <p>Preferred Contact: {enq.preferred_contact}</p>
                        </div>
                        <div>
                          <strong>Project Details</strong>
                          <p>{enq.details}</p>
                          {enq.deliverables && <p><strong>Deliverables:</strong> {enq.deliverables}</p>}
                          {enq.deadline && <p><strong>Deadline:</strong> {new Date(enq.deadline).toLocaleDateString()}</p>}
                        </div>
                        {enq.admin_notes && (
                          <div>
                            <strong>Admin Notes</strong>
                            <p>{enq.admin_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
      {enquiries.length === 0 && (
        <div className="admin-empty-state">
          <Inbox size={48}/>
          <h3>No enquiries found</h3>
          <p>New client enquiries will appear here</p>
        </div>
      )}
    </div>
  );
}

function ProjectsTable({ projects, onRefresh }: { projects: Project[], onRefresh: () => void }) {
  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Client</th>
            <th>Project</th>
            <th>Status</th>
            <th>Progress</th>
            <th>Payment</th>
            <th>Fee</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map(proj => (
            <tr key={proj.id}>
              <td><strong>{proj.reference}</strong></td>
              <td>
                <div className="client-info">
                  <div>{proj.client_name}</div>
                  <small>{proj.client_email}</small>
                </div>
              </td>
              <td>
                <div>
                  <div>{proj.title}</div>
                  <small className="muted">{proj.service}</small>
                </div>
              </td>
              <td>
                <span className="status-badge" style={{background: statusColors[proj.status] + '20', color: statusColors[proj.status]}}>
                  {statusLabels[proj.status]}
                </span>
              </td>
              <td>
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{width: `${proj.progress_percentage}%`}}></div>
                  <span className="progress-text">{proj.progress_percentage}%</span>
                </div>
              </td>
              <td>
                <div className="payment-status">
                  {proj.deposit_paid ? <CheckCircle size={14} color="#10b981"/> : <XCircle size={14} color="#ef4444"/>} Deposit
                  <br/>
                  {proj.balance_paid ? <CheckCircle size={14} color="#10b981"/> : <XCircle size={14} color="#ef4444"/>} Balance
                </div>
              </td>
              <td><strong>KES {proj.total_fee?.toLocaleString() || '—'}</strong></td>
              <td>
                <Link to={`/admin/project/${proj.id}`} className="btn-icon" title="Manage">
                  <Eye size={16}/>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {projects.length === 0 && (
        <div className="admin-empty-state">
          <Package size={48}/>
          <h3>No projects found</h3>
          <p>Active projects will appear here</p>
        </div>
      )}
    </div>
  );
}

function AnalyticsDashboard({ enquiries, projects }: { enquiries: Enquiry[], projects: Project[] }) {
  const serviceBreakdown = enquiries.reduce((acc, enq) => {
    acc[enq.service] = (acc[enq.service] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryBreakdown = enquiries.reduce((acc, enq) => {
    acc[enq.client_category] = (acc[enq.client_category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="analytics-grid">
      <div className="analytics-card">
        <h3>Enquiries by Service</h3>
        <div className="chart-bars">
          {Object.entries(serviceBreakdown).map(([service, count]) => (
            <div key={service} className="chart-bar-item">
              <div className="chart-bar-label">{service}</div>
              <div className="chart-bar-track">
                <div 
                  className="chart-bar-fill" 
                  style={{width: `${(count / enquiries.length) * 100}%`}}
                ></div>
              </div>
              <div className="chart-bar-value">{count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="analytics-card">
        <h3>Client Categories</h3>
        <div className="chart-bars">
          {Object.entries(categoryBreakdown).map(([category, count]) => (
            <div key={category} className="chart-bar-item">
              <div className="chart-bar-label">{category}</div>
              <div className="chart-bar-track">
                <div 
                  className="chart-bar-fill" 
                  style={{width: `${(count / enquiries.length) * 100}%`, background: '#10b981'}}
                ></div>
              </div>
              <div className="chart-bar-value">{count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="analytics-card">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          {[...enquiries].slice(0, 5).map(enq => (
            <div key={enq.id} className="activity-item">
              <div className="activity-icon"><Inbox size={16}/></div>
              <div>
                <div><strong>{enq.full_name}</strong> submitted an enquiry</div>
                <small>{new Date(enq.created_at).toLocaleString()}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="analytics-card">
        <h3>Project Status Distribution</h3>
        <div className="status-grid">
          {Object.entries(
            projects.reduce((acc, proj) => {
              acc[proj.status] = (acc[proj.status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          ).map(([status, count]) => (
            <div key={status} className="status-item">
              <div className="status-count" style={{background: statusColors[status]}}>{count}</div>
              <div className="status-name">{statusLabels[status]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SubmissionsTable({ submissions, onRefresh }: { submissions: ProjectSubmission[], onRefresh: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  async function handleConvert(submission: ProjectSubmission) {
    setConvertingId(submission.id);
  }

  return (
    <>
      {convertingId && (
        <ConvertSubmissionModal
          submission={submissions.find(s => s.id === convertingId)!}
          onClose={() => setConvertingId(null)}
          onSuccess={() => {
            setConvertingId(null);
            onRefresh();
          }}
        />
      )}
      <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Client</th>
            <th>Project Title</th>
            <th>Service</th>
            <th>Budget</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map(sub => (
            <>
              <tr key={sub.id} className={expanded === sub.id ? 'expanded' : ''}>
                <td><strong>{sub.reference}</strong></td>
                <td>
                  <div className="client-info">
                    <div>{sub.full_name}</div>
                    <small>{sub.email}</small>
                  </div>
                </td>
                <td>{sub.project_title}</td>
                <td><span className="service-badge">{sub.service}</span></td>
                <td>{sub.budget}</td>
                <td>
                  <span className="status-badge" style={{background: statusColors[sub.status] + '20', color: statusColors[sub.status]}}>
                    {statusLabels[sub.status]}
                  </span>
                </td>
                <td>{new Date(sub.created_at).toLocaleDateString()}</td>
                <td>
                  <button 
                    className="btn-icon" 
                    onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
                    title="View details"
                  >
                    {expanded === sub.id ? <ChevronUp size={16}/> : <Eye size={16}/>}
                  </button>
                  {sub.status === 'new' && (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleConvert(sub)}
                      title="Accept & Convert to Project"
                      style={{marginLeft: '8px'}}
                    >
                      <CheckCircle size={14}/> Accept
                    </button>
                  )}
                </td>
              </tr>
              {expanded === sub.id && (
                <tr className="expanded-row">
                  <td colSpan={8}>
                    <div className="expanded-content">
                      <div className="expanded-grid">
                        <div>
                          <strong>Contact Information</strong>
                          <p>Phone: {sub.phone || 'Not provided'}</p>
                          <p>Category: {sub.client_category}</p>
                          <p>Organisation: {sub.organisation || 'N/A'}</p>
                          <p>Preferred Contact: {sub.preferred_contact}</p>
                        </div>
                        <div>
                          <strong>Project Details</strong>
                          <p>{sub.details}</p>
                          {sub.deliverables && <p><strong>Deliverables:</strong> {sub.deliverables}</p>}
                          {sub.deadline && <p><strong>Deadline:</strong> {new Date(sub.deadline).toLocaleDateString()}</p>}
                        </div>
                        {sub.admin_notes && (
                          <div>
                            <strong>Admin Notes</strong>
                            <p>{sub.admin_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
      {submissions.length === 0 && (
        <div className="admin-empty-state">
          <Package size={48}/>
          <h3>No project submissions found</h3>
          <p>New client project submissions will appear here</p>
        </div>
      )}
    </div>
    </>
  );
}

function ConvertSubmissionModal({ submission, onClose, onSuccess }: {
  submission: ProjectSubmission;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [totalFee, setTotalFee] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');

  // Auto-calculate balance
  useEffect(() => {
    const total = parseFloat(totalFee) || 0;
    const deposit = parseFloat(depositAmount) || 0;
    setBalanceAmount((total - deposit).toString());
  }, [totalFee, depositAmount]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setConverting(true);

    try {
      const { convertSubmissionToProject } = await import('../lib/supabase');
      const project = await convertSubmissionToProject(submission, {
        total_fee: parseFloat(totalFee),
        deposit_amount: parseFloat(depositAmount),
        balance_amount: parseFloat(balanceAmount),
        agreed_deadline: deadline || undefined,
        admin_notes: notes || undefined
      });

      alert(`Project created successfully!\n\nReference: ${project.reference}\n\nShare this reference number with the client to track their project.`);
      onSuccess();
    } catch (err: any) {
      console.error('Conversion error:', err);
      setError(err.message || 'Failed to convert submission to project');
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="payment-form-overlay">
      <div className="payment-form-modal" style={{maxWidth: '600px'}}>
        <h3>Convert to Project: {submission.project_title}</h3>
        <p><strong>Client:</strong> {submission.full_name} ({submission.email})</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>
            Total Project Fee (KES) *
            <input 
              type="number" 
              value={totalFee}
              onChange={e => setTotalFee(e.target.value)}
              required 
              min="0"
              step="0.01"
              placeholder="e.g., 50000"
            />
          </label>

          <label>
            Deposit Amount (KES) *
            <input 
              type="number" 
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              required 
              min="0"
              step="0.01"
              placeholder="e.g., 25000"
            />
          </label>

          <label>
            Balance Amount (KES)
            <input 
              type="number" 
              value={balanceAmount}
              readOnly
              placeholder="Auto-calculated"
            />
            <small>Calculated as Total - Deposit</small>
          </label>

          <label>
            Agreed Deadline
            <input 
              type="date" 
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </label>

          <label>
            Admin Notes
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Internal notes about this project..."
            />
          </label>

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
              disabled={converting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={converting}
            >
              {converting ? 'Converting...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ContactsTable({ contacts, onRefresh }: { contacts: Contact[], onRefresh: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Subject</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map(contact => (
            <>
              <tr key={contact.id} className={expanded === contact.id ? 'expanded' : ''}>
                <td><strong>{contact.full_name}</strong></td>
                <td><small>{contact.email}</small></td>
                <td>{contact.subject || '—'}</td>
                <td><span className="service-badge">{contact.contact_reason || 'General'}</span></td>
                <td>
                  <span className="status-badge" style={{
                    background: contact.status === 'new' ? '#dbeafe' : contact.status === 'read' ? '#fef3c7' : '#d1fae5',
                    color: contact.status === 'new' ? '#1e40af' : contact.status === 'read' ? '#92400e' : '#065f46'
                  }}>
                    {contact.status}
                  </span>
                </td>
                <td>{new Date(contact.created_at).toLocaleDateString()}</td>
                <td>
                  <button 
                    className="btn-icon" 
                    onClick={() => setExpanded(expanded === contact.id ? null : contact.id)}
                    title="View message"
                  >
                    {expanded === contact.id ? <ChevronUp size={16}/> : <Eye size={16}/>}
                  </button>
                </td>
              </tr>
              {expanded === contact.id && (
                <tr className="expanded-row">
                  <td colSpan={7}>
                    <div className="expanded-content">
                      <div className="expanded-grid">
                        <div>
                          <strong>Contact Details</strong>
                          <p>Phone: {contact.phone || 'Not provided'}</p>
                          <p>Reason: {contact.contact_reason || 'Not specified'}</p>
                        </div>
                        <div>
                          <strong>Message</strong>
                          <p>{contact.message}</p>
                        </div>
                        {contact.admin_notes && (
                          <div>
                            <strong>Admin Notes</strong>
                            <p>{contact.admin_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
      {contacts.length === 0 && (
        <div className="admin-empty-state">
          <MessageSquare size={48}/>
          <h3>No contacts found</h3>
          <p>General contact messages will appear here</p>
        </div>
      )}
    </div>
  );
}
