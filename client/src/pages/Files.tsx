import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errMessage, downloadBlob, formatBytes, formatDate } from '../lib/api';
import {
  FileText,
  Search,
  Download,
  Trash2,
  Edit3,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface Doc {
  id: number;
  originalName: string;
  size: number;
  category: string;
  mimeType: string;
  createdAt: string;
}

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
      flash(`${list.length} file(s) uploaded successfully`);
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
      flash('File deleted from vault');
      load();
    } catch (err) {
      setError(await errMessage(err));
    }
  };

  return (
    <>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>My Document Library</h1>
          <p>{total} document{total === 1 ? '' : 's'} stored in your personal vault.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            ref={uploadRef}
            type="file"
            hidden
            multiple
            onChange={(e) => {
              onUpload(e.target.files);
              e.target.value = '';
            }}
          />
          <button className="btn btn-primary" onClick={() => uploadRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <>
                <span className="spinner" /> Uploading…
              </>
            ) : (
              <>
                <UploadCloud size={18} />
                <span>Upload Files</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="toolbar" style={{ borderBottom: 'none', padding: 0 }}>
          <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-sub)',
              }}
            />
            <input
              type="text"
              placeholder="Search documents by title…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ paddingLeft: 42, width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Filter size={16} style={{ color: 'var(--text-sub)' }} />
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              style={{ minWidth: 160 }}
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="center-load">
            <span className="spinner dark" />
          </div>
        ) : docs.length === 0 ? (
          <div className="empty">
            <div className="e-icon">📁</div>
            <p>No documents found in vault. Upload files or run tools to save outputs here!</p>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Category</th>
                  <th>Size</th>
                  <th>Uploaded Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="t-name-cell">
                        <div className="t-icon-box">
                          <FileText size={18} />
                        </div>
                        <span className="t-filename">{d.originalName}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${d.category}`}>
                        {d.category.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatBytes(d.size)}</td>
                    <td style={{ color: 'var(--text-sub)' }}>{formatDate(d.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => onDownload(d)}
                          title="Download document"
                        >
                          <Download size={14} />
                          <span>Download</span>
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => onRename(d)}
                          title="Rename file"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm danger"
                          onClick={() => onDelete(d)}
                          title="Delete file"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pages > 1 && (
              <div
                style={{
                  padding: '14px 20px',
                  background: 'var(--bg-warm)',
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
          </>
        )}
      </div>
    </>
  );
}
