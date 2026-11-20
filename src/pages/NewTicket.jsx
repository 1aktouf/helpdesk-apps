import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { post } from '../api';
import { useAuth } from '../AuthContext';

export default function NewTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    subject: '',
    category: 'technical',
    priority: 'medium',
    description: '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const ticket = await post('/tickets', form);
      setForm({ subject: '', category: 'technical', priority: 'medium', description: '' });
      navigate(`/tickets?created=${ticket.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className="page">
        <h1>Submit a Ticket</h1>
        <p className="page-sub">You need to be logged in to submit a ticket.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Submit a Ticket</h1>
      <p className="page-sub">Describe your issue and we'll get back to you.</p>

      {error && <div className="error-banner">{error}</div>}

      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="subject">Subject</label>
          <input
            id="subject"
            name="subject"
            type="text"
            value={form.subject}
            onChange={handleChange}
            required
            maxLength={120}
          />
        </div>

        <div className="field">
          <label htmlFor="category">Category</label>
          <select id="category" name="category" value={form.category} onChange={handleChange}>
            <option value="technical">Technical</option>
            <option value="billing">Billing</option>
            <option value="account">Account</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="priority">Priority</label>
          <select id="priority" name="priority" value={form.priority} onChange={handleChange}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            required
            maxLength={2000}
          />
        </div>

        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Ticket'}
        </button>
      </form>
    </div>
  );
}
