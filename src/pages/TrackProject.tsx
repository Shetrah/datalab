import { useState } from 'react';
import { ArrowRight, ShieldCheck, Search, FileText, DollarSign, Clock, CheckCircle, Download, Eye, AlertCircle, Target } from 'lucide-react';
import { PageIntro } from '../components/BrandLayout';
import { supabase, supabaseConfigured } from '../lib/supabase';

type ProjectStatus = {
  id: string;
  reference: string;
  title: string;
  service: string;
  status: string;
  progress_percentage: number;
  total_fee: number | null;
  deposit_amount: number | null;
  balance_amount: number | null;
  deposit_paid: boolean;
  balance_paid: boolean;
  agreed_deadline: string | null;
  created_at: string;
};

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  due_date: string | null;
};

type ProjectFile = {
  id: string;
  file_name: string;
  file_size: number | null;
  file_category: string | null;
  description: string | null;
  storage_path: string;
  is_watermarked: boolean;
  is_downloadable: boolean;
  requires_balance_payment: boolean;
  created_at: string;
};

type ClientPayment = {
  payment_type: string;
  amount: number;
  payment_method: string;
  transaction_reference: string;
  admin_notes?: string;
};

export default function TrackProject() {
  const [reference, setReference] = useState('');
  const [project, setProject] = useState<ProjectStatus | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentType, setPaymentType] = useState<'deposit' | 'balance'>('deposit');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  async function trackProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabaseConfigured || !reference.trim()) return;

    setLoading(true);
    setMessage('');
    setProject(null);
    setMilestones([]);
    setFiles([]);

    try {
      // Fetch project by reference
      const { data: projectData, error: projectError } = await supabase!
        .from('projects')
        .select('id, reference, title, service, status, progress_percentage, total_fee, deposit_amount, balance_amount, deposit_paid, balance_paid, agreed_deadline, created_at')
        .eq('reference', reference.trim().toUpperCase())
        .single();

      if (projectError || !projectData) {
        setMessage('Project not found. Please check your reference number.');
        return;
      }

      setProject(projectData);

      // Fetch milestones
      const { data: milestonesData } = await supabase!
        .from('project_milestones')
        .select('id, title, description, completed, due_date')
        .eq('project_id', projectData.id)
        .order('display_order', { ascending: true });

      setMilestones(milestonesData || []);

      // Fetch visible files
      const { data: filesData } = await supabase!
        .from('project_files')
        .select('id, file_name, file_size, file_category, description, storage_path, is_watermarked, is_downloadable, requires_balance_payment, created_at')
        .eq('project_id', projectData.id)
        .eq('visible_to_client', true)
        .order('created_at', { ascending: false });

      setFiles(filesData || []);

    } catch (error) {
      console.error('Tracking error:', error);
      setMessage('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePaymentSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!project || !supabase) return;

    const formData = new FormData(e.currentTarget);
    const amount = paymentType === 'deposit' ? project.deposit_amount : project.balance_amount;

    const payment: ClientPayment = {
      payment_type: paymentType,
      amount: amount || 0,
      payment_method: formData.get('payment_method') as string,
      transaction_reference: formData.get('transaction_reference') as string,
      admin_notes: `Client submitted ${paymentType} payment via tracking portal`
    };

    setSubmittingPayment(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          project_id: project.id,
          ...payment,
          payment_status: 'pending'
        });

      if (error) throw error;

      setMessage(`${paymentType === 'deposit' ? 'Deposit' : 'Balance'} payment submitted successfully! Our team will verify and update your project status.`);
      setShowPaymentForm(false);
      
      // Refresh project data
      const form = document.querySelector('form') as HTMLFormElement;
      if (form) {
        const syntheticEvent = new Event('submit', { bubbles: true, cancelable: true }) as any;
        form.dispatchEvent(syntheticEvent);
        trackProject(syntheticEvent);
      }

    } catch (error) {
      console.error('Payment submission error:', error);
      setMessage('Failed to submit payment. Please try again or contact support.');
    } finally {
      setSubmittingPayment(false);
    }
  }

  async function downloadFile(file: ProjectFile) {
    if (!supabase) return;

    if (file.requires_balance_payment && !project?.balance_paid) {
      setMessage('Please complete the balance payment to download this file.');
      return;
    }

    try {
      const { data } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storage_path, 3600);

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      setMessage('Failed to download file.');
    }
  }

  async function viewFile(file: ProjectFile) {
    if (!supabase) return;

    try {
      const { data } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storage_path, 3600);

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('View error:', error);
      setMessage('Failed to view file.');
    }
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      'awaiting_deposit': 'status-warning',
      'deposit_confirmed': 'status-info',
      'in_progress': 'status-primary',
      'awaiting_draft_review': 'status-review',
      'revision_requested': 'status-warning',
      'draft_approved': 'status-success',
      'awaiting_balance_payment': 'status-warning',
      'payment_verification_pending': 'status-info',
      'final_deliverables_available': 'status-success',
      'completed': 'status-completed',
      'on_hold': 'status-hold',
      'cancelled': 'status-danger'
    };
    return colors[status] || 'status-default';
  }

  function getStatusText(status: string) {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  const canPayDeposit = project && !project.deposit_paid && project.deposit_amount && project.deposit_amount > 0;
  const canPayBalance = project && project.deposit_paid && !project.balance_paid && project.balance_amount && project.balance_amount > 0 && 
    (project.status === 'draft_approved' || project.status === 'awaiting_balance_payment');

  return (
    <>
      <PageIntro 
        eyebrow="Client Portal" 
        title="Track your project" 
        lead="Enter your project reference number to view real-time progress, milestones, payments, and deliverables."
      />

      <section className="section">
        <div className="container track-layout">
          {!project ? (
            <div className="track-search-section">
              <div className="track-copy">
                <div className="detail-icon">
                  <ShieldCheck size={28}/>
                </div>
                <h2>Secure project tracking</h2>
                <p>
                  Track your project status, view milestones, submit payments, and access deliverables 
                  using your unique reference number.
                </p>
                <div className="mini-steps">
                  <div>
                    <b>01</b>
                    <span>
                      <strong>Enter Reference</strong>
                      <small>Use the reference number provided by Datalab (e.g., DRC-2026-001)</small>
                    </span>
                  </div>
                  <div>
                    <b>02</b>
                    <span>
                      <strong>View Progress</strong>
                      <small>Check status, milestones, and payment information</small>
                    </span>
                  </div>
                  <div>
                    <b>03</b>
                    <span>
                      <strong>Submit Payments</strong>
                      <small>Pay deposit or balance directly through the portal</small>
                    </span>
                  </div>
                  <div>
                    <b>04</b>
                    <span>
                      <strong>Access Files</strong>
                      <small>View and download project deliverables</small>
                    </span>
                  </div>
                </div>
              </div>

              <form className="contact-form track-form" onSubmit={trackProject}>
                <h2>Track Your Project</h2>
                <p>Enter your project reference number below</p>

                {message && (
                  <div className={message.includes('not found') || message.includes('error') ? 'error-msg' : 'success-msg'} role="status">
                    {message}
                  </div>
                )}

                <div className="form-grid">
                  <label className="full-field">
                    Project Reference Number
                    <input 
                      name="reference" 
                      value={reference}
                      onChange={e => setReference(e.target.value.toUpperCase())}
                      required 
                      autoComplete="off" 
                      placeholder="e.g., DRC-2026-001"
                      disabled={loading}
                    />
                  </label>
                </div>

                <button className="btn btn-primary full-btn" disabled={loading || !supabaseConfigured}>
                  {loading ? 'Searching...' : 'Track Project'} <Search size={17}/>
                </button>

                <small className="muted">
                  {supabaseConfigured 
                    ? 'Your reference number was provided when your project was created' 
                    : 'Tracking is currently unavailable. Please contact support.'}
                </small>
              </form>
            </div>
          ) : (
            <div className="project-tracking-dashboard">
              {/* Header */}
              <div className="tracking-header">
                <div>
                  <button 
                    onClick={() => { setProject(null); setReference(''); setMessage(''); }} 
                    className="text-link"
                  >
                    ← Track Different Project
                  </button>
                  <h1>{project.title}</h1>
                  <p className="tracking-ref">Reference: <strong>{project.reference}</strong></p>
                </div>
                <div className={`project-status-badge ${getStatusColor(project.status)}`}>
                  {getStatusText(project.status)}
                </div>
              </div>

              {message && (
                <div className={message.includes('Failed') || message.includes('complete') ? 'error-msg' : 'success-msg'}>
                  {message}
                </div>
              )}

              {/* Quick Stats */}
              <div className="tracking-stats">
                <div className="tracking-stat-card">
                  <Target size={24} />
                  <div>
                    <div className="stat-value">{project.progress_percentage}%</div>
                    <div className="stat-label">Progress</div>
                  </div>
                </div>
                <div className="tracking-stat-card">
                  <DollarSign size={24} />
                  <div>
                    <div className="stat-value">KES {project.total_fee?.toLocaleString() || '—'}</div>
                    <div className="stat-label">Total Fee</div>
                  </div>
                </div>
                <div className="tracking-stat-card">
                  <CheckCircle size={24} />
                  <div>
                    <div className="stat-value">{milestones.filter(m => m.completed).length}/{milestones.length}</div>
                    <div className="stat-label">Milestones</div>
                  </div>
                </div>
                <div className="tracking-stat-card">
                  <FileText size={24} />
                  <div>
                    <div className="stat-value">{files.length}</div>
                    <div className="stat-label">Files</div>
                  </div>
                </div>
              </div>

              {/* Payment Section */}
              <div className="tracking-section">
                <h2><DollarSign size={20} /> Payment Status</h2>
                <div className="payment-tracking-grid">
                  <div className={`payment-track-card ${project.deposit_paid ? 'paid' : 'unpaid'}`}>
                    <div className="payment-track-header">
                      <h3>Deposit Payment</h3>
                      {project.deposit_paid ? (
                        <CheckCircle size={20} className="text-success" />
                      ) : (
                        <Clock size={20} className="text-warning" />
                      )}
                    </div>
                    <div className="payment-track-amount">
                      KES {project.deposit_amount?.toLocaleString() || '—'}
                    </div>
                    <div className="payment-track-status">
                      {project.deposit_paid ? 'Paid & Verified' : 'Awaiting Payment'}
                    </div>
                    {canPayDeposit && (
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => { setPaymentType('deposit'); setShowPaymentForm(true); }}
                      >
                        Submit Deposit Payment
                      </button>
                    )}
                  </div>

                  <div className={`payment-track-card ${project.balance_paid ? 'paid' : 'unpaid'}`}>
                    <div className="payment-track-header">
                      <h3>Balance Payment</h3>
                      {project.balance_paid ? (
                        <CheckCircle size={20} className="text-success" />
                      ) : project.deposit_paid ? (
                        <Clock size={20} className="text-warning" />
                      ) : (
                        <AlertCircle size={20} className="text-muted" />
                      )}
                    </div>
                    <div className="payment-track-amount">
                      KES {project.balance_amount?.toLocaleString() || '—'}
                    </div>
                    <div className="payment-track-status">
                      {project.balance_paid ? 'Paid & Verified' : !project.deposit_paid ? 'Requires Deposit First' : 'Awaiting Payment'}
                    </div>
                    {canPayBalance && (
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => { setPaymentType('balance'); setShowPaymentForm(true); }}
                      >
                        Submit Balance Payment
                      </button>
                    )}
                  </div>
                </div>

                {showPaymentForm && (
                  <div className="payment-form-overlay">
                    <div className="payment-form-modal">
                      <h3>Submit {paymentType === 'deposit' ? 'Deposit' : 'Balance'} Payment</h3>
                      <p>Amount: <strong>KES {(paymentType === 'deposit' ? project.deposit_amount : project.balance_amount)?.toLocaleString()}</strong></p>

                      <form onSubmit={handlePaymentSubmit}>
                        <label>
                          Payment Method *
                          <select name="payment_method" required>
                            <option value="">Select method</option>
                            <option value="M-Pesa">M-Pesa</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Card">Card</option>
                            <option value="Other">Other</option>
                          </select>
                        </label>

                        <label>
                          Transaction Reference *
                          <input 
                            type="text" 
                            name="transaction_reference" 
                            required 
                            placeholder="e.g., M-Pesa code, bank ref"
                          />
                        </label>

                        <div className="payment-instructions">
                          <h4>Payment Instructions:</h4>
                          <p><strong>M-Pesa:</strong> Send to [Business Number]</p>
                          <p><strong>Bank Transfer:</strong> Account [Number], Bank [Name]</p>
                          <p>After payment, enter your transaction reference above for verification.</p>
                        </div>

                        <div className="modal-actions">
                          <button 
                            type="button" 
                            className="btn btn-secondary"
                            onClick={() => setShowPaymentForm(false)}
                            disabled={submittingPayment}
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={submittingPayment}
                          >
                            {submittingPayment ? 'Submitting...' : 'Submit Payment'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>

              {/* Milestones */}
              {milestones.length > 0 && (
                <div className="tracking-section">
                  <h2><Target size={20} /> Project Milestones</h2>
                  <div className="milestones-timeline">
                    {milestones.map((milestone, idx) => (
                      <div key={milestone.id} className={`milestone-timeline-item ${milestone.completed ? 'completed' : 'pending'}`}>
                        <div className="milestone-timeline-marker">
                          {milestone.completed ? <CheckCircle size={20} /> : <Clock size={20} />}
                        </div>
                        <div className="milestone-timeline-content">
                          <h4>{milestone.title}</h4>
                          {milestone.description && <p>{milestone.description}</p>}
                          {milestone.due_date && (
                            <p className="milestone-date">Due: {new Date(milestone.due_date).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files */}
              {files.length > 0 && (
                <div className="tracking-section">
                  <h2><FileText size={20} /> Project Files</h2>
                  <div className="files-tracking-grid">
                    {files.map(file => (
                      <div key={file.id} className="file-tracking-card">
                        <div className="file-tracking-icon">
                          <FileText size={32} />
                        </div>
                        <div className="file-tracking-info">
                          <h4>{file.file_name}</h4>
                          {file.description && <p>{file.description}</p>}
                          <div className="file-tracking-meta">
                            <span>{file.file_size ? `${(file.file_size / 1024).toFixed(0)} KB` : '—'}</span>
                            <span>{new Date(file.created_at).toLocaleDateString()}</span>
                          </div>
                          {file.is_watermarked && (
                            <span className="file-badge watermark">Watermarked Preview</span>
                          )}
                          {file.requires_balance_payment && !project.balance_paid && (
                            <span className="file-badge locked">Requires Balance Payment</span>
                          )}
                        </div>
                        <div className="file-tracking-actions">
                          <button 
                            className="btn-icon" 
                            onClick={() => viewFile(file)}
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          {file.is_downloadable && (!file.requires_balance_payment || project.balance_paid) && (
                            <button 
                              className="btn-icon" 
                              onClick={() => downloadFile(file)}
                              title="Download"
                            >
                              <Download size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {project.agreed_deadline && (
                <div className="tracking-deadline">
                  <Clock size={16} />
                  <span>Agreed Deadline: <strong>{new Date(project.agreed_deadline).toLocaleDateString()}</strong></span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
