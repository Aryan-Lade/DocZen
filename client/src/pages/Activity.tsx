import { useCallback, useEffect, useState } from 'react';
import { api, errMessage, formatDate } from '../lib/api';
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ActivityItem {
  id: number;
  operation: string;
  fileName: string;
  status: string;
  details?: string;
  createdAt: string;
}

export default function Activity() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/activity', { params: { page: p, limit: 15 } });
      setItems(data.activities);
      setPages(data.pages || 1);
      setTotal(data.total);
    } catch (err) {
      setError(await errMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [load, page]);

  const clearAll = async () => {
    if (!window.confirm('Clear all activity logs? This cannot be undone.')) return;
    try {
      await api.delete('/api/activity');
      setPage(1);
      load(1);
    } catch (err) {
      setError(await errMessage(err));
    }
  };

  const filtered = items.filter((a) => {
    if (statusFilter === 'all') return true;
    return a.status === statusFilter;
  });

  return (
    <>
      <div
        className="page-head"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1>Activity Logs</h1>
          <p>{total} total operation{total === 1 ? '' : 's'} logged across your account.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => load(page)} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spinner' : ''} />
            <span>Refresh</span>
          </button>
          {items.length > 0 && (
            <button className="btn btn-ghost btn-sm danger" onClick={clearAll}>
              <Trash2 size={14} />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="toolbar" style={{ borderBottom: 'none', padding: 0 }}>
          <div className="cat-pills">
            <button
              className={`pill${statusFilter === 'all' ? ' active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All Logs ({items.length})
            </button>
            <button
              className={`pill${statusFilter === 'success' ? ' active' : ''}`}
              onClick={() => setStatusFilter('success')}
            >
              <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
              <span>Success ({items.filter((a) => a.status === 'success').length})</span>
            </button>
            <button
              className={`pill${statusFilter === 'error' ? ' active' : ''}`}
              onClick={() => setStatusFilter('error')}
            >
              <AlertCircle size={14} style={{ color: 'var(--error)' }} />
              <span>Errors ({items.filter((a) => a.status === 'error').length})</span>
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="center-load">
            <span className="spinner dark" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="e-icon">🕑</div>
            <p>No activity recorded under this view.</p>
          </div>
        ) : (
          filtered.map((a) => (
            <div className="act-row" key={a.id}>
              <div
                className="a-icon"
                style={{
                  background: a.status === 'error' ? '#fef2f2' : 'var(--primary-light)',
                  color: a.status === 'error' ? 'var(--error)' : 'var(--primary)',
                }}
              >
                {a.status === 'error' ? <AlertCircle size={18} /> : <Zap size={18} />}
              </div>
              <div className="a-body">
                <div className="a-op" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{a.operation}</span>
                  <span className={`badge badge-${a.status === 'error' ? 'other' : 'pdf'}`}>
                    {a.status.toUpperCase()}
                  </span>
                </div>
                <div className="a-file">{a.fileName}</div>
                {a.details && (
                  <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 4 }}>
                    {a.details}
                  </div>
                )}
              </div>
              <div className="a-time" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} />
                <span>{formatDate(a.createdAt)}</span>
              </div>
            </div>
          ))
        )}

        {pages > 1 && (
          <div
            className="pager"
            style={{
              paddingTop: 16,
              marginTop: 16,
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <button
              className="btn btn-ghost btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <span style={{ fontSize: 13, color: 'var(--text-sub)', fontWeight: 600 }}>
              Page {page} of {pages}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
