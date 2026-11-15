import { useState } from 'react';

export default function NewTicket() {
  const [form, setForm] = useState({
    subject: '',
    category: 'technical',
    priority: 'medium',
    description: '',
  });
  const [submitted, setSubmitted] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // TODO: replace with a real POST to the backend API once Dev A's endpoints exist
    console.log('New ticket submitted:', form);
    setSubmitted({ ...form, id: Date.now() });
    setForm({ subject: '', category: 'technical', priority: 'medium', description: '' });
  }

  return (
    <div className="page">
      <h1>Submit a Ticket</h1>
      <p className="page-sub">Describe your issue and we'll get back to you.</p>

      {submitted && (
        <div className="success-banner">
          Ticket "{submitted.subject}" submitted (demo only — not sent anywhere yet).
        </div>
      )}

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

        <button type="submit" className="btn">Submit Ticket</button>
      </form>
    </div>
  );
}
