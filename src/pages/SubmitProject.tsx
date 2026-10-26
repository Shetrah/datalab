import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Upload, X, FileText, CheckCircle } from 'lucide-react';
import { PageIntro } from '../components/BrandLayout';
import { serviceData } from '../content/siteContent';
import { 
  submitProjectSubmission, uploadSubmissionFile, createSubmissionFile, 
  supabaseConfigured 
} from '../lib/supabase';

export default function SubmitProject() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const selectedService = new URLSearchParams(window.location.search).get('service') || '';

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files || []);
    // Limit to 5 files, max 10MB each
    const validFiles = newFiles.filter(f => {
      if (f.size > 10 * 1024 * 1024) {
        setError(`File ${f.name} is too large. Maximum 10MB per file.`);
        return false;
      }
      return true;
    });
    
    if (files.length + validFiles.length > 5) {
      setError('Maximum 5 files allowed');
      return;
    }
    
    setFiles([...files, ...validFiles]);
    setError('');
  }

  function removeFile(index: number) {
    setFiles(files.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const form = e.currentTarget;
    const data = new FormData(form);

    if (!supabaseConfigured) {
      setError('Project submission is not configured. Please contact us directly.');
      return;
    }

    setBusy(true);
    setUploading(files.length > 0);

    try {
      // Submit project
      const submission = await submitProjectSubmission({
        full_name: String(data.get('full_name')),
        email: String(data.get('email')).trim().toLowerCase(),
        phone: String(data.get('phone') || '') || null,
        client_category: String(data.get('client_category')),
        organisation: String(data.get('organisation') || '') || null,
        service: String(data.get('service')),
        project_title: String(data.get('project_title')),
        details: String(data.get('details')),
        deliverables: String(data.get('deliverables') || '') || null,
        deadline: String(data.get('deadline') || '') || null,
        budget: String(data.get('budget')),
        preferred_contact: String(data.get('preferred_contact'))
      });

      // Upload files if any
      if (files.length > 0) {
        for (const file of files) {
          try {
            const uploadResult = await uploadSubmissionFile(file, submission.id);
            await createSubmissionFile({
              submission_id: submission.id,
              file_name: uploadResult.name,
              file_size: uploadResult.size,
              file_type: uploadResult.type,
              storage_path: uploadResult.path
            });
          } catch (fileError) {
            console.error('File upload error:', fileError);
            // Continue with other files even if one fails
          }
        }
      }

      setReferenceNumber(submission.reference);
      setSent(true);
      form.reset();
      setFiles([]);
      setUploading(false);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(`Submission failed: ${err.message || 'Unknown error'}. Please try again or email us directly.`);
      setUploading(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageIntro 
        eyebrow="Submit a Project" 
        title="Let's bring your research to life." 
        lead="Share your project details and any supporting documents. We'll review your submission and get back to you with a tailored proposal."
      />
      
      <section className="section">
        <div className="container submit-project-layout">
          <div className="submit-info">
            <span className="eyebrow"><span/>WHAT TO INCLUDE</span>
            <h2>Tell us about your research goals</h2>
            <p>The more context you provide, the better we can understand your needs and prepare a relevant quotation.</p>

            <div className="submit-checklist">
              <div className="checklist-item">
                <CheckCircle size={20}/>
                <div>
                  <strong>Project overview</strong>
                  <p>What are you trying to achieve?</p>
                </div>
              </div>
              <div className="checklist-item">
                <CheckCircle size={20}/>
                <div>
                  <strong>Expected deliverables</strong>
                  <p>What specific outputs do you need?</p>
                </div>
              </div>
              <div className="checklist-item">
                <CheckCircle size={20}/>
                <div>
                  <strong>Timeline & budget</strong>
                  <p>When do you need it and what's your budget range?</p>
                </div>
              </div>
              <div className="checklist-item">
                <CheckCircle size={20}/>
                <div>
                  <strong>Supporting documents</strong>
                  <p>Upload datasets, questionnaires, or project briefs (optional)</p>
                </div>
              </div>
            </div>

            <div className="submit-note">
              <FileText size={20}/>
              <div>
                <strong>Your submission reference</strong>
                <p>You'll receive a unique reference number to track your submission. Keep it safe!</p>
              </div>
            </div>
          </div>

          <form className="contact-form submit-form" onSubmit={handleSubmit}>
            <h2>Project Submission Form</h2>
            <p>All fields marked * are required. Files are optional but helpful.</p>

            {sent && (
              <div className="success-msg" role="status">
                <CheckCircle size={18}/>
                <div>
                  <strong>Submission received!</strong>
                  <p>Thank you! We've received your project submission.</p>
                  {referenceNumber && (
                    <p style={{marginTop: '1rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px', border: '2px solid #3b82f6'}}>
                      <strong style={{color: '#1e40af', fontSize: '1.1rem'}}>Your Reference Number:</strong><br/>
                      <span style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#1e40af', fontFamily: 'monospace'}}>{referenceNumber}</span><br/>
                      <small style={{color: '#64748b'}}>Save this number! You'll need it if we accept your project and create a tracking reference.</small>
                    </p>
                  )}
                  <p style={{marginTop: '1rem'}}>The Datalab team will review it and respond within 2 business days.</p>
                </div>
              </div>
            )}

            {error && <div className="error-msg" role="alert">{error}</div>}

            <div className="form-grid">
              <label>
                Full name *
                <input name="full_name" required autoComplete="name"/>
              </label>
              <label>
                Email address *
                <input type="email" name="email" required autoComplete="email"/>
              </label>
              <label>
                Phone / WhatsApp
                <input name="phone" autoComplete="tel"/>
              </label>
              <label>
                Client type *
                <select name="client_category" required defaultValue="">
                  <option value="" disabled>Select client type</option>
                  <option>Academic</option>
                  <option>Organisation</option>
                  <option>Other</option>
                </select>
              </label>
              <label>
                Organisation / university
                <input name="organisation"/>
              </label>
              <label>
                Service interested in *
                <select name="service" required defaultValue={selectedService}>
                  <option value="" disabled>Select a service</option>
                  {serviceData.map(s => <option key={s.slug}>{s.title}</option>)}
                  <option>Not sure yet</option>
                </select>
              </label>
              <label className="full-field">
                Project title *
                <input name="project_title" required placeholder="Brief title for your project"/>
              </label>
              <label className="full-field">
                Research problem and requested support *
                <textarea 
                  name="details" 
                  required 
                  rows={5}
                  placeholder="Describe your research question, data, methodology needs, or analysis requirements. The more detail, the better we can help."
                />
              </label>
              <label className="full-field">
                Expected deliverables
                <input 
                  name="deliverables"
                  placeholder="e.g., Analysis report, visualizations, cleaned dataset, methodology chapter"
                />
              </label>
              <label>
                Preferred deadline
                <input type="date" name="deadline"/>
              </label>
              <label>
                Estimated budget *
                <select name="budget" required defaultValue="Unsure">
                  <option>Unsure</option>
                  <option>Under KES 25,000</option>
                  <option>KES 25,000–75,000</option>
                  <option>KES 75,000–150,000</option>
                  <option>Above KES 150,000</option>
                </select>
              </label>
              <label className="full-field">
                Preferred contact method
                <select name="preferred_contact" defaultValue="Email">
                  <option>Email</option>
                  <option>WhatsApp</option>
                  <option>Phone call</option>
                </select>
              </label>

              {/* File Upload Section */}
              <div className="full-field file-upload-section">
                <label className="file-upload-label">
                  <Upload size={18}/>
                  Supporting documents (optional)
                  <small>Upload datasets, questionnaires, project briefs, or any relevant files. Max 5 files, 10MB each.</small>
                </label>
                
                <label className="file-upload-button">
                  <input 
                    type="file" 
                    multiple 
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    disabled={busy || files.length >= 5}
                  />
                  <span className="btn btn-outline-dark">
                    <Upload size={16}/> Choose Files
                  </span>
                </label>

                {files.length > 0 && (
                  <div className="uploaded-files-list">
                    <div className="files-list-header">
                      <strong>{files.length} file{files.length !== 1 ? 's' : ''} ready to upload</strong>
                    </div>
                    {files.map((file, index) => (
                      <div key={index} className="uploaded-file-item">
                        <FileText size={16}/>
                        <div className="file-item-info">
                          <span className="file-item-name">{file.name}</span>
                          <span className="file-item-size">{(file.size / 1024).toFixed(0)} KB</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => removeFile(index)}
                          className="file-remove-btn"
                          disabled={busy}
                          title="Remove file"
                        >
                          <X size={16}/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="consent full-field">
                <input type="checkbox" required name="privacy_acknowledged"/>
                I agree that Datalab may use these details to respond. I understand that any files I upload will be stored securely and used only for this project submission.
              </label>
            </div>

            <button className="btn btn-primary full-btn" disabled={busy}>
              {uploading ? (
                <>Uploading files...</>
              ) : busy ? (
                <>Submitting...</>
              ) : (
                <>Submit Project <ArrowRight size={17}/></>
              )}
            </button>

            <small className="muted">
              {supabaseConfigured 
                ? "Your submission and files will be saved securely. You'll receive a reference number to track your request."
                : 'Project submission system is being configured. Please contact us directly.'}
            </small>

            <Link to="/track" className="text-link">Already submitted? Track your project</Link>
          </form>
        </div>
      </section>
    </>
  );
}
