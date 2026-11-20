import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { get } from '../api';
import { useAuth } from '../AuthContext';

export default function MyTickets() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    get('/tickets')
      .then(setTickets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  async function toggleTicket(id) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    try {
      const d = await get(`/tickets/${id}`);
      setDetail(d);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return (
      <div className="page">
        <h1>My Tickets</h1>
        <p className="page-sub">Log in to see your submitted tickets.</p>
      </div>
    );
  }

  const createdId = searchParams.get('created');

  return (
    <div className="page">
      <h1>My Tickets</h1>
      <p className="page-sub">Your submitted tickets, newest first.</p>

      {createdId && <div className="success-banner">Ticket #{createdId} submitted.</div>}
      {error && <div className="error-banner">{error}</div>}
      {loading && <p>Loading…</p>}
      {!loading && tickets.length === 0 && <p>No tickets yet.</p>}

      <div className="ticket-list">
        {tickets.map((t) => (
          <div key={t.id} className="card ticket-row">
            <button className="ticket-row-head" onClick={() => toggleTicket(t.id)}>
              <span className="ticket-subject">{t.subject}</span>
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
