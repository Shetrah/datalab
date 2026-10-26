import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, FileText, MessageCircle, Target } from 'lucide-react';
import { PageIntro } from '../components/BrandLayout';
import { email, phone, phoneDigits } from '../content/siteContent';
import { submitContact, supabaseConfigured } from '../lib/supabase';

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const form = e.currentTarget;
    const data = new FormData(form);

    if (!supabaseConfigured) {
      const body = Array.from(data.entries()).map(([k, v]) => `${k}: ${v}`).join('\n');
      window.location.href = `mailto:${email}?subject=${encodeURIComponent('Datalab Contact Message')}&body=${encodeURIComponent(body)}`;
      setSent(true);
      return;
    }

    setBusy(true);
    try {
      await submitContact({
        full_name: String(data.get('full_name')),
        email: String(data.get('email')).trim().toLowerCase(),
        phone: String(data.get('phone') || '') || undefined,
        subject: String(data.get('subject') || '') || undefined,
        message: String(data.get('message')),
        contact_reason: String(data.get('contact_reason')) || undefined
      });
      setSent(true);
      form.reset();
    } catch {
      setError('We could not save your message. Please try again or email us directly.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageIntro 
        eyebrow="Contact Datalab" 
        title="Get in touch with us" 
        lead="Whether you have a question, feedback, or want to explore partnership opportunities, we're here to help."
      />
      
      <section className="section">
        <div className="container contact-layout">
          <div className="contact-info">
            <span className="eyebrow"><span/>REACH OUT TO US</span>
            <h2>We'd love to hear from you</h2>
            <p>Have a question about our services? Need support? Want to discuss a partnership? Use the form or reach out directly.</p>

            <div className="contact-method">
              <span><MessageCircle/></span>
              <div>
                <b>WhatsApp</b>
                <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer">
                  {phone} <ArrowUpRight size={14}/>
                </a>
              </div>
            </div>

            <div className="contact-method">
              <span><FileText/></span>
              <div>
                <b>Email</b>
                <a href={`mailto:${email}`}>{email}</a>
                <small>For general inquiries and support</small>
              </div>
            </div>

            <div className="contact-method">
              <span><Target/></span>
              <div>
                <b>Location</b>
                <p>View Park Towers, Suite 1605<br/>Utalii Lane, Nairobi, Kenya</p>
              </div>
            </div>

            <div className="contact-cta">
              <h3>Ready to start a project?</h3>
              <p>For research and data consulting projects, use our dedicated submission form.</p>
              <Link to="/submit-project" className="btn btn-primary">
                Submit a Project <ArrowRight size={16}/>
              </Link>
            </div>
          </div>

          <form className="contact-form" onSubmit={handleSubmit}>
            <h2>Contact Form</h2>
            <p>Fields marked * are required. We'll respond within 1-2 business days.</p>

            {sent && (
              <div className="success-msg" role="status">
                Message sent! We'll get back to you soon.
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
                Reason for contact
                <select name="contact_reason" defaultValue="General Inquiry">
                  <option>General Inquiry</option>
                  <option>Partnership</option>
                  <option>Feedback</option>
                  <option>Support</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="full-field">
                Subject
                <input name="subject" placeholder="Brief subject line"/>
              </label>
              <label className="full-field">
                Your message *
                <textarea 
                  name="message" 
                  required 
                  rows={6}
                  placeholder="Tell us how we can help..."
                />
              </label>
            </div>

            <button className="btn btn-primary full-btn" disabled={busy}>
              {busy ? 'Sending...' : 'Send Message'} <ArrowRight size={17}/>
            </button>

            <small className="muted">
              {supabaseConfigured 
                ? 'Your message will be saved securely and our team will respond promptly.'
                : 'Contact form is in setup mode. Use email or WhatsApp for immediate response.'}
            </small>
          </form>
        </div>
      </section>
    </>
  );
}
