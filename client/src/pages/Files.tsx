import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errMessage, downloadBlob, formatBytes, formatDate } from '../lib/api';

interface Doc {
  id: number;
  originalName: string;
  size: number;
  category: string;
  mimeType: string;
  createdAt: string;
}

const catIcons: Record<string, string> = {
  pdf: '📄', image: '🖼️', word: '📝', excel: '📊', ppt: '📽️', text: '📃', other: '📦',
};

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'pdf', label: 'PDF' },
  { value: 'image', label: 'Images' },
  { value: 'word', label: 'Word' },
  { value: 'excel', label: 'Excel' },
  { value: 'ppt', label: 'PowerPoint' },
  { value: 'text', label: 'Text' },
  { value: 'other', label: 'Other' },
];

export default function Files() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/files', {
        params: { search: search || undefined, category: category || undefined, page: p, limit: 12 },
      });
      setDocs(data.files);
      setTotal(data.total);
      setPages(data.pages || 1);
    } catch (err) {
      setError(await errMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, category, page]);

  useEffect(() => {
    const t = setTimeout(() => load(page), search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, page, search, category]);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  };

  const onUpload = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      Array.from(list).forEach((f) => fd.append('files', f));
      await api.post('/api/files/upload', fd);
      flash(`${list.length} file(s) uploaded`);
      setPage(1);
      load(1);
    } catch (err) {
      setError(await errMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const onDownload = async (doc: Doc) => {
    try {
      const res = await api.get(`/api/files/${doc.id}/download`, { responseType: 'blob' });
      downloadBlob(res.data, doc.originalName);
    } catch (err) {
      setError(await errMessage(err));
    }
  };

  const onRename = async (doc: Doc) => {
    const name = window.prompt('New file name:', doc.originalName);
    if (!name || name === doc.originalName) return;
    try {
      await api.put(`/api/files/${doc.id}/rename`, { name });
      flash('File renamed');
      load();
    } catch (err) {
      setError(await errMessage(err));
    }
  };

  const onDelete = async (doc: Doc) => {
    if (!window.confirm(`Delete "${doc.originalName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/files/${doc.id}`);
      flash('File deleted');
      load();
    } catch (err) {
      setError(await errMessage(err));
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>My Files</h1>
        <p>{total} file{total === 1 ? '' : 's'} stored in your workspace.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="toolbar">
        <input
          type="text"
          placeholder="🔍 Search files…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ width: 260 }}
        />
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <div className="spacer" />
        <input ref={uploadRef} type="file" hidden multiple onChange={(e) => { onUpload(e.target.files); e.target.value = ''; }} />
        <button className="btn btn-primary" onClick={() => uploadRef.current?.click()} disabled={uploading}>
          {uploading ? <span className="spinner" /> : '⬆️ Upload files'}
        </button>
      </div>

      {loading ? (
        <div className="center-load"><span className="spinner dark" /></div>
      ) : docs.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="e-icon">📁</div>
            No files yet. Upload some files to keep them in your workspace.
          </div>
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th style={{ width: 190 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>
                    {catIcons[d.category] ?? '📦'} {d.originalName}
                  </td>
                  <td><span className="badge badge-gray">{d.category}</span></td>
                  <td>{formatBytes(d.size)}</td>
                  <td>{formatDate(d.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => onDownload(d)}>⬇️</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => onRename(d)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => onDelete(d)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
