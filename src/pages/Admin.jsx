import { useEffect, useState } from 'react';
import { get, patch } from '../api';
import { useAuth } from '../AuthContext';

export default function Admin() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [status, setStatus] = useState('open');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const isAdmin = user && user.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  function loadList() {
    setLoading(true);
    get('/admin/tickets')
      .then(setTickets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function openTicket(id) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    setComment('');
    try {
      const d = await get(`/admin/tickets/${id}`);
      setDetail(d);
      setStatus(d.status);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSave(id) {
    setSaving(true);
    setError(null);
    try {
      const body = { status };
      if (comment.trim()) body.comment = comment.trim();
      const updated = await patch(`/admin/tickets/${id}`, body);
      setDetail(updated);
      setComment('');
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: updated.status } : t)));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="page">
        <h1>Admin Dashboard</h1>
        <p className="page-sub">Log in with a staff account to view the ticket queue.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page">
        <h1>Admin Dashboard</h1>
        <p className="page-sub">Your account doesn't have staff access.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Admin Dashboard</h1>
      <p className="page-sub">All tickets, newest first.</p>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p>Loading…</p>}
      {!loading && tickets.length === 0 && <p>No tickets yet.</p>}

      <div className="ticket-list">
        {tickets.map((t) => (
          <div key={t.id} className="card ticket-row">
            <button className="ticket-row-head" onClick={() => openTicket(t.id)}>
              <span className="ticket-subject">{t.subject}</span>
              <span className="page-sub">{t.ownerEmail}</span>
              <span className={`badge badge-${t.status}`}>{t.status}</span>
              <span className={`badge badge-priority-${t.priority}`}>{t.priority}</span>
            </button>

            {openId === t.id && (
              <div className="ticket-detail">
                {!detail && <p>Loading…</p>}
                {detail && (
                  <>
                    <p>{detail.description}</p>
                    <h4>Replies</h4>
                    {detail.comments.length === 0 && <p className="page-sub">No replies yet.</p>}
                    {detail.comments.map((c) => (
                      <div key={c.id} className="comment">
                        <strong>{c.authorEmail}</strong> ({c.authorRole}): {c.body}
                      </div>
                    ))}

                    <div className="field">
                      <label htmlFor={`status-${t.id}`}>Status</label>
                      <select
                        id={`status-${t.id}`}
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    <div className="field">
                      <label htmlFor={`comment-${t.id}`}>Reply (optional)</label>
                      <textarea
                        id={`comment-${t.id}`}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        maxLength={2000}
                      />
                    </div>

                    <button className="btn" disabled={saving} onClick={() => handleSave(t.id)}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
