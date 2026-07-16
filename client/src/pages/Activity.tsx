import { useCallback, useEffect, useState } from 'react';
import { api, errMessage, formatDate } from '../lib/api';

interface ActivityItem {
  id: number;
  operation: string;
  fileName: string;
  status: string;
  createdAt: string;
}

const opIcons: Record<string, string> = {
  'PDF Merge': '🔗', 'PDF Split': '✂️', 'PDF Compress': '🗜️', 'PDF Protect': '🔒',
  'PDF Unlock': '🔓', 'PDF Reorder': '🔀', 'PDF Rotate': '🔄', 'PDF Watermark': '💧',
  'PDF Page Numbers': '🔢', 'Image Compress': '🖼️', 'Image Convert': '🎨',
  'PDF to Image': '📸', 'OCR Extract': '👁️', 'Text to PDF': '📝', 'Office to PDF': '📊',
  'HTML to PDF': '🌐', 'Language Detection': '🌍', 'File Upload': '⬆️', 'File Delete': '🗑️',
};

export default function Activity() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => { load(page); }, [load, page]);

  const clearAll = async () => {
    if (!window.confirm('Clear the entire activity log?')) return;
    try {
      await api.delete('/api/activity');
      setPage(1);
      load(1);
    } catch (err) {
      setError(await errMessage(err));
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Activity Log</h1>
        <p>{total} operation{total === 1 ? '' : 's'} recorded.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="toolbar">
        <div className="spacer" />
        <button className="btn btn-danger" onClick={clearAll} disabled={items.length === 0}>
          Clear log
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="center-load"><span className="spinner dark" /></div>
        ) : items.length === 0 ? (
          <div className="empty">
            <div className="e-icon">🕑</div>
            No activity yet.
          </div>
        ) : (
          items.map((a) => (
            <div className="act-row" key={a.id}>
              <div className="a-icon">{opIcons[a.operation] ?? '⚙️'}</div>
              <div className="a-body">
                <div className="a-op">{a.operation}</div>
                <div className="a-file">{a.fileName}</div>
              </div>
              <span className={`badge ${a.status === 'success' ? 'badge-green' : 'badge-red'}`}>{a.status}</span>
              <div className="a-time" style={{ marginLeft: 12 }}>{formatDate(a.createdAt)}</div>
            </div>
          ))
        )}
      </div>

      {pages > 1 && (
        <div className="pager">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span>Page {page} of {pages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </>
  );
}
