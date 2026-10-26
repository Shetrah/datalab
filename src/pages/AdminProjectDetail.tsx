import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Upload, Download, Trash2, Plus, CheckCircle,
  Clock, DollarSign, FileText, MessageSquare, Target, User,
  Calendar, Edit, XCircle, AlertCircle
} from 'lucide-react';
import {
  getProjectById, updateProject, getProjectMilestones, createMilestone,
  updateMilestone, deleteMilestone, getProjectPayments, createPayment,
  updatePayment, getProjectFiles, createProjectFile, deleteProjectFile,
  uploadFile, getFileUrl, deleteFile, type Project, type Milestone,
  type Payment, type ProjectFile
} from '../lib/supabase';

export default function AdminProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'payments' | 'files' | 'communication'>('overview');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (id) loadProjectData();
  }, [id]);

  async function loadProjectData() {
    try {
      const [proj, miles, pays, fileData] = await Promise.all([
        getProjectById(id!),
        getProjectMilestones(id!),
        getProjectPayments(id!),
        getProjectFiles(id!)
      ]);
      setProject(proj);
      setMilestones(miles);
      setPayments(pays);
      setFiles(fileData);
    } catch (error) {
      setMessage('Could not load project data');
    } finally {
      setLoading(false);
    }
  }

  async function saveProject() {
    if (!project) return;
    setSaving(true);
    try {
      await updateProject(project.id, project);
      setMessage('Project updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to update project');
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, category: string) {
    const file = e.target.files?.[0];
    if (!file || !project) return;

    setUploading(true);
    try {
      const uploadResult = await uploadFile(file, project.id, category);
      
      // Determine watermark settings based on category
      const isWatermarked = category === 'draft_watermarked';
      const requiresBalancePayment = category === 'final';
      const isDownloadable = category !== 'draft_watermarked'; // Watermarked drafts are view-only
      
      await createProjectFile({
        project_id: project.id,
        file_name: uploadResult.name,
        file_size: uploadResult.size,
        file_type: uploadResult.type,
        storage_path: uploadResult.path,
        uploaded_by_type: 'admin',
        file_category: category,
        visible_to_client: true,
        is_watermarked: isWatermarked,
        is_downloadable: isDownloadable,
        requires_balance_payment: requiresBalancePayment
      });
      await loadProjectData();
      setMessage('File uploaded successfully');
    } catch (error) {
      setMessage('File upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteFile(file: ProjectFile) {
    if (!confirm('Delete this file?')) return;
    try {
      await deleteFile(file.storage_path);
      await deleteProjectFile(file.id);
      await loadProjectData();
      setMessage('File deleted');
    } catch (error) {
      setMessage('Failed to delete file');
    }
  }

  async function addMilestone() {
    if (!project) return;
    try {
      await createMilestone({
        project_id: project.id,
        title: 'New Milestone',
        description: '',
        display_order: milestones.length,
        completed: false
      });
      await loadProjectData();
    } catch (error) {
      setMessage('Failed to create milestone');
    }
  }

  async function saveMilestone(milestone: Milestone) {
    try {
      await updateMilestone(milestone.id, milestone);
      setMessage('Milestone updated');
      await loadProjectData();
    } catch (error) {
      setMessage('Failed to update milestone');
    }
  }

  async function removeMilestone(id: string) {
    if (!confirm('Delete this milestone?')) return;
    try {
      await deleteMilestone(id);
      await loadProjectData();
    } catch (error) {
      setMessage('Failed to delete milestone');
    }
  }

  async function addPayment() {
    if (!project) return;
    try {
      await createPayment({
        project_id: project.id,
        payment_type: 'deposit',
        amount: project.deposit_amount || 0,
        payment_status: 'pending'
      });
      await loadProjectData();
    } catch (error) {
      setMessage('Failed to record payment');
    }
  }

  async function verifyPayment(payment: Payment) {
    try {
      await updatePayment(payment.id, {
        payment_status: 'verified',
        verified_at: new Date().toISOString()
      });
      
      // Update project payment flags
      if (payment.payment_type === 'deposit' && project) {
        await updateProject(project.id, { deposit_paid: true });
      } else if (payment.payment_type === 'balance' && project) {
        await updateProject(project.id, { balance_paid: true });
      }
      
      await loadProjectData();
      setMessage('Payment verified');
    } catch (error) {
      setMessage('Failed to verify payment');
    }
  }

  if (loading) {
    return <div className="admin-loading"><Clock size={24}/> Loading project...</div>;
  }

  if (!project) {
    return <div className="admin-error"><AlertCircle size={24}/> Project not found</div>;
  }

  return (
    <main className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-header-content">
          <div>
            <Link to="/admin" className="text-link"><ArrowLeft size={16}/> Back to dashboard</Link>
            <h1>Project: {project.reference}</h1>
            <p>{project.title}</p>
          </div>
        </div>
      </div>

      {message && (
        <div className="admin-message">
          {message.includes('success') || message.includes('updated') || message.includes('verified') ? (
            <CheckCircle size={16}/>
          ) : (
            <AlertCircle size={16}/>
          )}
          {message}
        </div>
      )}

      <div className="project-detail-container">
        <div className="project-sidebar">
          <div className="project-info-card">
            <div className="project-avatar">
              {project.client_name.charAt(0).toUpperCase()}
            </div>
            <h3>{project.client_name}</h3>
            <p>{project.client_email}</p>
            {project.client_phone && <p>{project.client_phone}</p>}
          </div>

          <div className="project-quick-stats">
            <div className="quick-stat">
              <Target size={16}/>
              <div>
                <div className="quick-stat-value">{project.progress_percentage}%</div>
                <div className="quick-stat-label">Progress</div>
              </div>
            </div>
            <div className="quick-stat">
              <DollarSign size={16}/>
              <div>
                <div className="quick-stat-value">KES {project.total_fee?.toLocaleString() || '—'}</div>
                <div className="quick-stat-label">Total Fee</div>
              </div>
            </div>
            <div className="quick-stat">
              <FileText size={16}/>
              <div>
                <div className="quick-stat-value">{files.length}</div>
                <div className="quick-stat-label">Files</div>
              </div>
            </div>
          </div>

          <div className="project-status-card">
            <label>
              Project Status
              <select 
                value={project.status}
                onChange={e => setProject({...project, status: e.target.value})}
              >
                <option value="awaiting_deposit">Awaiting Deposit</option>
                <option value="deposit_confirmed">Deposit Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="awaiting_draft_review">Awaiting Review</option>
                <option value="revision_requested">Revision Requested</option>
                <option value="draft_approved">Draft Approved</option>
                <option value="awaiting_balance_payment">Awaiting Balance</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>

            <label>
              Progress %
              <input 
                type="number" 
                min="0" 
                max="100"
                value={project.progress_percentage}
                onChange={e => setProject({...project, progress_percentage: parseInt(e.target.value)})}
              />
            </label>

            <button className="btn btn-primary full-btn" onClick={saveProject} disabled={saving}>
              <Save size={16}/> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="project-main-content">
          <div className="project-tabs">
            <button 
              className={activeTab === 'overview' ? 'active' : ''}
              onClick={() => setActiveTab('overview')}
            >
              <FileText size={16}/> Overview
            </button>
            <button 
              className={activeTab === 'milestones' ? 'active' : ''}
              onClick={() => setActiveTab('milestones')}
            >
              <Target size={16}/> Milestones ({milestones.length})
            </button>
            <button 
              className={activeTab === 'payments' ? 'active' : ''}
              onClick={() => setActiveTab('payments')}
            >
              <DollarSign size={16}/> Payments ({payments.length})
            </button>
            <button 
              className={activeTab === 'files' ? 'active' : ''}
              onClick={() => setActiveTab('files')}
            >
              <Upload size={16}/> Files ({files.length})
            </button>
            <button 
              className={activeTab === 'communication' ? 'active' : ''}
              onClick={() => setActiveTab('communication')}
            >
              <MessageSquare size={16}/> Communication
            </button>
          </div>

          <div className="project-tab-content">
            {activeTab === 'overview' && (
              <div className="project-overview">
                <div className="overview-section">
                  <h3>Project Details</h3>
                  <div className="form-grid">
                    <label>
                      Project Title
                      <input 
                        type="text"
                        value={project.title}
                        onChange={e => setProject({...project, title: e.target.value})}
                      />
                    </label>
                    <label>
                      Service
                      <input 
                        type="text"
                        value={project.service}
                        onChange={e => setProject({...project, service: e.target.value})}
                      />
                    </label>
                    <label className="full-field">
                      Description
                      <textarea 
                        rows={4}
                        value={project.description || ''}
                        onChange={e => setProject({...project, description: e.target.value})}
                      />
                    </label>
                    <label>
                      Agreed Deadline
                      <input 
                        type="date"
                        value={project.agreed_deadline || ''}
                        onChange={e => setProject({...project, agreed_deadline: e.target.value})}
                      />
                    </label>
                  </div>
                </div>

                <div className="overview-section">
                  <h3>Financial Details</h3>
                  <div className="form-grid">
                    <label>
                      Total Fee (KES)
                      <input 
                        type="number"
                        value={project.total_fee || ''}
                        onChange={e => setProject({...project, total_fee: parseFloat(e.target.value)})}
                      />
                    </label>
                    <label>
                      Deposit Amount (KES)
                      <input 
                        type="number"
                        value={project.deposit_amount || ''}
                        onChange={e => setProject({...project, deposit_amount: parseFloat(e.target.value)})}
                      />
                    </label>
                    <label>
                      Balance Amount (KES)
                      <input 
                        type="number"
                        value={project.balance_amount || ''}
                        onChange={e => setProject({...project, balance_amount: parseFloat(e.target.value)})}
                      />
                    </label>
                    <label className="full-field">
                      Admin Notes
                      <textarea 
                        rows={3}
                        value={project.admin_notes || ''}
                        onChange={e => setProject({...project, admin_notes: e.target.value})}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'milestones' && (
              <div className="milestones-section">
                <div className="section-header">
                  <h3>Project Milestones</h3>
                  <button className="btn btn-primary" onClick={addMilestone}>
                    <Plus size={16}/> Add Milestone
                  </button>
                </div>
                <div className="milestones-list">
                  {milestones.map(milestone => (
                    <MilestoneCard 
                      key={milestone.id}
                      milestone={milestone}
                      onSave={saveMilestone}
                      onDelete={removeMilestone}
                    />
                  ))}
                  {milestones.length === 0 && (
                    <div className="empty-state">
                      <Target size={32}/>
                      <p>No milestones yet. Add one to track progress.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="payments-section">
                <div className="section-header">
                  <h3>Payment Records</h3>
                  <button className="btn btn-primary" onClick={addPayment}>
                    <Plus size={16}/> Record Payment
                  </button>
                </div>
                <div className="payments-list">
                  {payments.map(payment => (
                    <PaymentCard 
                      key={payment.id}
                      payment={payment}
                      onVerify={verifyPayment}
                    />
                  ))}
                  {payments.length === 0 && (
                    <div className="empty-state">
                      <DollarSign size={32}/>
                      <p>No payment records yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'files' && (
              <div className="files-section">
                <div className="section-header">
                  <h3>Project Files</h3>
                  <div className="file-upload-buttons">
                    <label className="btn btn-outline-dark btn-sm">
                      <Upload size={14}/> Upload Draft (Watermarked)
                      <input 
                        type="file" 
                        hidden 
                        onChange={e => handleFileUpload(e, 'draft_watermarked')}
                        disabled={uploading}
                      />
                    </label>
                    <label className="btn btn-primary btn-sm">
                      <Upload size={14}/> Upload Final File
                      <input 
                        type="file" 
                        hidden 
                        onChange={e => handleFileUpload(e, 'final')}
                        disabled={uploading}
                      />
                    </label>
                    <label className="btn btn-outline-dark btn-sm">
                      <Upload size={14}/> Upload Other
                      <input 
                        type="file" 
                        hidden 
                        onChange={e => handleFileUpload(e, 'other')}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>
                <div className="file-upload-guide">
                  <p><strong>Draft (Watermarked):</strong> View-only preview for client approval. Not downloadable until balance paid.</p>
                  <p><strong>Final File:</strong> Clean copy without watermark. Client can download only after balance payment verified.</p>
                </div>
                {uploading && <div className="upload-progress">Uploading...</div>}
                <div className="files-grid">
                  {files.map(file => (
                    <FileCard 
                      key={file.id}
                      file={file}
                      onDelete={handleDeleteFile}
                    />
                  ))}
                  {files.length === 0 && (
                    <div className="empty-state">
                      <FileText size={32}/>
                      <p>No files uploaded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'communication' && (
              <div className="communication-section">
                <div className="section-header">
                  <h3>Project Communication</h3>
                </div>
                <div className="empty-state">
                  <MessageSquare size={32}/>
                  <p>Communication feature coming soon</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function MilestoneCard({ 
  milestone, onSave, onDelete 
}: { 
  milestone: Milestone, 
  onSave: (m: Milestone) => void, 
  onDelete: (id: string) => void 
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(milestone);

  return (
    <div className={`milestone-card ${milestone.completed ? 'completed' : ''}`}>
      <div className="milestone-header">
        <input 
          type="checkbox"
          checked={draft.completed}
          onChange={e => {
            const updated = {...draft, completed: e.target.checked};
            setDraft(updated);
            onSave(updated);
          }}
        />
        {editing ? (
          <input 
            type="text"
            value={draft.title}
            onChange={e => setDraft({...draft, title: e.target.value})}
            className="milestone-title-input"
          />
        ) : (
          <h4>{milestone.title}</h4>
        )}
        <div className="milestone-actions">
          {editing ? (
            <>
              <button onClick={() => { onSave(draft); setEditing(false); }}>
                <CheckCircle size={16}/>
              </button>
              <button onClick={() => { setDraft(milestone); setEditing(false); }}>
                <XCircle size={16}/>
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}>
              <Edit size={16}/>
            </button>
          )}
          <button onClick={() => onDelete(milestone.id)} className="delete-btn">
            <Trash2 size={16}/>
          </button>
        </div>
      </div>
      {editing && (
        <div className="milestone-edit">
          <textarea 
            value={draft.description || ''}
            onChange={e => setDraft({...draft, description: e.target.value})}
            placeholder="Milestone description"
            rows={2}
          />
          <input 
            type="date"
            value={draft.due_date || ''}
            onChange={e => setDraft({...draft, due_date: e.target.value})}
          />
        </div>
      )}
      {!editing && milestone.description && <p>{milestone.description}</p>}
      {!editing && milestone.due_date && (
        <div className="milestone-date">
          <Calendar size={14}/> Due: {new Date(milestone.due_date).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function PaymentCard({ 
  payment, onVerify 
}: { 
  payment: Payment, 
  onVerify: (p: Payment) => void 
}) {
  return (
    <div className={`payment-card ${payment.payment_status}`}>
      <div className="payment-header">
        <div>
          <h4>{payment.payment_type.charAt(0).toUpperCase() + payment.payment_type.slice(1)} Payment</h4>
          <p className="payment-amount">KES {payment.amount.toLocaleString()}</p>
        </div>
        <div className={`payment-status-badge ${payment.payment_status}`}>
          {payment.payment_status}
        </div>
      </div>
      <div className="payment-details">
        {payment.payment_method && <p><strong>Method:</strong> {payment.payment_method}</p>}
        {payment.transaction_reference && <p><strong>Reference:</strong> {payment.transaction_reference}</p>}
        <p><strong>Recorded:</strong> {new Date(payment.created_at).toLocaleString()}</p>
        {payment.admin_notes && <p><strong>Notes:</strong> {payment.admin_notes}</p>}
      </div>
      {payment.payment_status === 'pending' && (
        <button className="btn btn-primary btn-sm" onClick={() => onVerify(payment)}>
          <CheckCircle size={14}/> Verify Payment
        </button>
      )}
    </div>
  );
}

function FileCard({ 
  file, onDelete 
}: { 
  file: ProjectFile, 
  onDelete: (f: ProjectFile) => void 
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    getFileUrl(file.storage_path).then(setUrl);
  }, [file.storage_path]);

  return (
    <div className="file-card">
      <div className="file-icon">
        <FileText size={24}/>
      </div>
      <div className="file-info">
        <h5>{file.file_name}</h5>
        <p>{(file.file_size! / 1024).toFixed(0)} KB</p>
        <p className="file-date">{new Date(file.created_at).toLocaleDateString()}</p>
        {file.is_watermarked && (
          <span className="file-badge" style={{background: '#fef3c7', color: '#92400e', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block'}}>
            Watermarked
          </span>
        )}
        {file.requires_balance_payment && (
          <span className="file-badge" style={{background: '#fee2e2', color: '#991b1b', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block', marginLeft: '4px'}}>
            Requires Payment
          </span>
        )}
        {!file.is_downloadable && (
          <span className="file-badge" style={{background: '#e0e7ff', color: '#3730a3', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block', marginLeft: '4px'}}>
            View Only
          </span>
        )}
      </div>
      <div className="file-actions">
        {url && (
          <a href={url} download className="btn-icon" title="Download">
            <Download size={16}/>
          </a>
        )}
        <button onClick={() => onDelete(file)} className="btn-icon delete-btn" title="Delete">
          <Trash2 size={16}/>
        </button>
      </div>
    </div>
  );
}
