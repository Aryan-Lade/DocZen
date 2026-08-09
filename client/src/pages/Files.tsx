import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errMessage, downloadBlob, formatBytes, formatDate } from '../lib/api';
import {
  FileText,
  Download,
  Trash2,
  Edit3,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Share2,
  Folder,
  FolderPlus,
  Users,
  Lock,
  Calendar,
  Hash,
  X
} from 'lucide-react';
import SearchBar from '../components/SearchBar';

interface Doc {
  id: string | number;
  originalName: string;
  size: number;
  category: string;
  mimeType: string;
  createdAt: string;
  folderId?: string | null;
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

  // Folder states
  const [folders, setFolders] = useState<{ owned: any[]; shared: any[] }>({ owned: [], shared: [] });
  const [activeFolder, setActiveFolder] = useState<any | null>(null);
  const [activeDropdownFolderId, setActiveDropdownFolderId] = useState<string | null>(null);
  
  // Folder Modal states
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState<'create' | 'rename'>('create');
  const [folderModalName, setFolderModalName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Share Folder Modal states
  const [showShareFolderModal, setShowShareFolderModal] = useState(false);
  const [shareFolderEmail, setShareFolderEmail] = useState('');
  const [shareFolderPermission, setShareFolderPermission] = useState<'view' | 'upload'>('view');
  const [folderShares, setFolderShares] = useState<any[]>([]);
  const [shareFolderObject, setShareFolderObject] = useState<any | null>(null);

  // File Share Link Modal states
  const [showShareFileModal, setShowShareFileModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [sharePasscode, setSharePasscode] = useState('');
  const [shareExpires, setShareExpires] = useState('');
  const [shareLimit, setShareLimit] = useState('');
  const [generatedShareLink, setGeneratedShareLink] = useState('');

  // Close dropdown on click outside
  useEffect(() => {
    const handleGlobalClick = () => setActiveDropdownFolderId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const loadFolders = async () => {
    try {
      const { data } = await api.get('/api/folders');
      setFolders({ owned: data.owned || [], shared: data.shared || [] });
    } catch (err) {
      console.error('Error loading folders', err);
    }
  };

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      if (activeFolder) {
        // Fetch files inside folder (both owned and shared folder contents)
        const { data } = await api.get(`/api/folders/${activeFolder.id}`);
        setDocs(data.documents || []);
        setTotal(data.documents?.length || 0);
        setPages(1);
      } else {
        // Fetch files at root
        const { data } = await api.get('/api/files', {
          params: { search: search || undefined, category: category || undefined, page: p, limit: 12, folderId: 'root' },
        });
        setDocs(data.files);
        setTotal(data.total);
        setPages(data.pages || 1);
        await loadFolders();
      }
    } catch (err) {
      setError(await errMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, category, page, activeFolder]);

  useEffect(() => {
    const t = setTimeout(() => load(page), search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, page, search, category, activeFolder]);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  };

  const onUpload = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      Array.from(list).forEach((f) => fd.append('files', f));
      if (activeFolder) {
        fd.append('folderId', activeFolder.id);
      }
      await api.post('/api/files/upload', fd);
      flash(`${list.length} file(s) uploaded successfully`);
      if (!activeFolder) setPage(1);
      load();
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

  // Folder Operations
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderModalName.trim()) return;
    try {
      await api.post('/api/folders', { name: folderModalName });
      flash('Folder created');
      setFolderModalName('');
      setShowFolderModal(false);
      load();
    } catch (err) {
      setError(await errMessage(err));
    }
  };

  const handleRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderModalName.trim() || !selectedFolderId) return;
    try {
      await api.put(`/api/folders/${selectedFolderId}`, { name: folderModalName });
      flash('Folder renamed');
      setFolderModalName('');
      setShowFolderModal(false);
      load();
    } catch (err) {
      setError(await errMessage(err));
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!window.confirm(`Delete folder "${folderName}" and ALL files inside it? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/folders/${folderId}`);
      flash('Folder deleted');
      load();
    } catch (err) {
      setError(await errMessage(err));
    }
  };

  const handleLeaveFolder = async (shareId: string, folderName: string) => {
    if (!window.confirm(`Leave shared folder "${folderName}"? You will lose access.`)) return;
    try {
      await api.delete(`/api/folders/shares/${shareId}`);
      flash('Left shared folder');
      load();
    } catch (err) {
      setError(await errMessage(err));
    }
  };

  const openShareFolderModal = async (folder: any) => {
    setShareFolderObject(folder);
    setShareFolderEmail('');
    setShareFolderPermission('view');
    setFolderShares([]);
    setShowShareFolderModal(true);
    try {
      const { data } = await api.get(`/api/folders/${folder.id}/shares`);
      setFolderShares(data.shares || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleShareFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareFolderEmail.trim() || !shareFolderObject) return;
    try {
      await api.post(`/api/folders/${shareFolderObject.id}/share`, {
        email: shareFolderEmail,
        permission: shareFolderPermission,
      });
      flash(`Shared with ${shareFolderEmail}`);
      setShareFolderEmail('');
      const { data } = await api.get(`/api/folders/${shareFolderObject.id}/shares`);
      setFolderShares(data.shares || []);
    } catch (err) {
      setError(await errMessage(err));
    }
  };

  const handleRevokeFolderShare = async (shareId: string) => {
    try {
      await api.delete(`/api/folders/shares/${shareId}`);
      flash('Access revoked');
      const { data } = await api.get(`/api/folders/${shareFolderObject.id}/shares`);
      setFolderShares(data.shares || []);
    } catch (err) {
      setError(await errMessage(err));
    }
  };

  // Secure File sharing links
  const openShareFileModal = (doc: Doc) => {
    setSelectedDoc(doc);
    setSharePasscode('');
    setShareExpires('');
    setShareLimit('');
    setGeneratedShareLink('');
    setShowShareFileModal(true);
  };

  const handleCreateFileShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    try {
      const { data } = await api.post('/api/shares/create', {
        documentId: selectedDoc.id,
        password: sharePasscode || undefined,
        expiresInHours: shareExpires || undefined,
        downloadLimit: shareLimit || undefined,
      });
      
      const shareUrl = `${window.location.origin}/share/${data.share.token}`;
      setGeneratedShareLink(shareUrl);
      flash('Secure link generated!');
    } catch (err) {
      setError(await errMessage(err));
    }
  };

  // Client-side filtering inside folders
  const displayedDocs = activeFolder
    ? docs.filter((d) => {
        const matchesSearch = search ? d.originalName.toLowerCase().includes(search.toLowerCase()) : true;
        const matchesCategory = category ? d.category === category : true;
        return matchesSearch && matchesCategory;
      })
    : docs;

  const showUploadBtn = !activeFolder || activeFolder.permission !== 'view';

  return (
    <>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>{activeFolder ? activeFolder.name : 'My Document Library'}</h1>
          <p>
            {activeFolder 
              ? `Viewing folder contents (${displayedDocs.length} file${displayedDocs.length === 1 ? '' : 's'})`
              : `${total} document${total === 1 ? '' : 's'} stored in your personal vault.`
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!activeFolder && (
            <button 
              className="btn btn-secondary" 
              onClick={() => { 
                setFolderModalMode('create'); 
                setFolderModalName(''); 
                setShowFolderModal(true); 
              }}
            >
              <FolderPlus size={18} />
              <span>New Folder</span>
            </button>
          )}

          {showUploadBtn && (
            <>
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
            </>
          )}
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

      {/* Breadcrumb when inside a folder */}
      {activeFolder && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 14, fontWeight: 600 }}>
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={() => setActiveFolder(null)} 
            style={{ padding: '4px 8px', color: 'var(--primary)' }}
          >
            Vault
          </button>
          <span style={{ color: 'var(--text-sub)' }}>/</span>
          <span style={{ color: 'var(--text-main)' }}>{activeFolder.name}</span>
          {activeFolder.permission !== 'owner' && (
            <span className="folder-badge">
              Shared ({activeFolder.permission})
            </span>
          )}
        </div>
      )}

      {/* Folders Section */}
      {!activeFolder && (folders.owned.length > 0 || folders.shared.length > 0) && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Folder size={18} style={{ color: 'var(--primary)' }} />
            <span>Folders</span>
          </h3>
          <div className="folder-grid">
            {folders.owned.map((f) => (
              <div 
                key={f.id} 
                className="folder-card" 
                onClick={() => setActiveFolder({ id: f.id, name: f.name, permission: 'owner' })}
              >
                <div className="folder-icon">📁</div>
                <div className="folder-info">
                  <div className="folder-name">{f.name}</div>
                </div>
                <button 
                  className="folder-actions-trigger" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdownFolderId(activeDropdownFolderId === f.id ? null : f.id);
                  }}
                >
                  ⋮
                </button>
                {activeDropdownFolderId === f.id && (
                  <div className="folder-actions-dropdown" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => {
                      setSelectedFolderId(f.id);
                      setFolderModalName(f.name);
                      setFolderModalMode('rename');
                      setShowFolderModal(true);
                      setActiveDropdownFolderId(null);
                    }}>
                      ✏️ Rename
                    </button>
                    <button onClick={() => {
                      openShareFolderModal(f);
                      setActiveDropdownFolderId(null);
                    }}>
                      👥 Share
                    </button>
                    <button className="danger" onClick={() => {
                      handleDeleteFolder(f.id, f.name);
                      setActiveDropdownFolderId(null);
                    }}>
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
            {folders.shared.map((f) => (
              <div 
                key={f.id} 
                className="folder-card" 
                onClick={() => setActiveFolder({ id: f.id, name: f.name, permission: f.permission })}
              >
                <div className="folder-icon" style={{ color: 'var(--primary)' }}>📁</div>
                <div className="folder-info">
                  <div className="folder-name" style={{ display: 'flex', alignItems: 'center' }}>
                    {f.name}
                    <span className="folder-badge" style={{ fontSize: 9 }}>Shared</span>
                  </div>
                </div>
                <button 
                  className="folder-actions-trigger" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdownFolderId(activeDropdownFolderId === f.id ? null : f.id);
                  }}
                >
                  ⋮
                </button>
                {activeDropdownFolderId === f.id && (
                  <div className="folder-actions-dropdown" onClick={(e) => e.stopPropagation()}>
                    <button className="danger" onClick={() => {
                      handleLeaveFolder(f.shareId, f.name);
                      setActiveDropdownFolderId(null);
                    }}>
                      🚪 Leave Folder
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="toolbar" style={{ borderBottom: 'none', padding: 0 }}>
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search documents by title…"
            minWidth={260}
          />

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
        ) : displayedDocs.length === 0 ? (
          <div className="empty">
            <div className="e-icon">📁</div>
            <p>No documents found. Upload files or run tools to save outputs here!</p>
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
                {displayedDocs.map((d) => (
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
                        
                        {(!activeFolder || activeFolder.permission === 'owner') && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openShareFileModal(d)}
                            title="Get secure share link"
                            style={{ color: 'var(--primary)' }}
                          >
                            <Share2 size={14} />
                            <span>Share Link</span>
                          </button>
                        )}

                        {(!activeFolder || activeFolder.permission === 'owner') && (
                          <>
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
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!activeFolder && pages > 1 && (
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

      {/* ================= FOLDER MODAL ================= */}
      {showFolderModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{folderModalMode === 'create' ? 'Create New Folder' : 'Rename Folder'}</h3>
              <button className="modal-close-btn" onClick={() => setShowFolderModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={folderModalMode === 'create' ? handleCreateFolder : handleRenameFolder}>
              <div className="field" style={{ margin: '12px 0' }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Folder Name</label>
                <input
                  type="text"
                  placeholder="e.g. Invoices, Personal Documents"
                  value={folderModalName}
                  onChange={(e) => setFolderModalName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowFolderModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {folderModalMode === 'create' ? 'Create' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= SHARE FOLDER MODAL ================= */}
      {showShareFolderModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Share: "{shareFolderObject?.name}"</h3>
              <button className="modal-close-btn" onClick={() => setShowShareFolderModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleShareFolder} style={{ marginBottom: 20 }}>
              <div className="field" style={{ margin: '12px 0' }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Collaborator's Email</label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={shareFolderEmail}
                  onChange={(e) => setShareFolderEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field" style={{ margin: '12px 0' }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Permissions</label>
                <select
                  value={shareFolderPermission}
                  onChange={(e) => setShareFolderPermission(e.target.value as any)}
                >
                  <option value="view">Viewer (Read-only)</option>
                  <option value="upload">Editor (Can view and upload)</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-block" style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
                <Users size={16} />
                <span>Invite User</span>
              </button>
            </form>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-main)' }}>People with access</h4>
              {folderShares.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-sub)' }}>Not shared with anyone yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 180, overflowY: 'auto' }}>
                  {folderShares.map((s) => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-subtle)', padding: '6px 10px', borderRadius: 6 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-main)' }}>{s.sharedWithUser?.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                          {s.sharedWithUser?.email} • <span style={{ fontWeight: 700, fontSize: 9 }}>{s.permission.toUpperCase()}</span>
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm danger"
                        style={{ padding: '2px 8px', fontSize: 11 }}
                        onClick={() => handleRevokeFolderShare(s.id)}
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= SECURE FILE SHARE MODAL ================= */}
      {showShareFileModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Secure Link Sharing</h3>
              <button className="modal-close-btn" onClick={() => setShowShareFileModal(false)}>
                <X size={18} />
              </button>
            </div>

            {!generatedShareLink ? (
              <form onSubmit={handleCreateFileShare}>
                <div style={{
                  background: 'var(--surface-subtle)',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  color: 'var(--text-main)',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <FileText size={16} style={{ color: 'var(--primary)' }} />
                  <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                    {selectedDoc?.originalName}
                  </strong>
                </div>

                <div className="field" style={{ margin: '12px 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontWeight: 600 }}>
                    <span>Passcode Protection (Optional)</span>
                    <Lock size={12} style={{ color: 'var(--text-sub)' }} />
                  </label>
                  <input
                    type="password"
                    placeholder="Enter download passcode"
                    value={sharePasscode}
                    onChange={(e) => setSharePasscode(e.target.value)}
                  />
                  <div className="hint" style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 4 }}>
                    If set, users will need to enter this code to download the file.
                  </div>
                </div>

                <div className="field" style={{ margin: '12px 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontWeight: 600 }}>
                    <span>Link Expiration (Optional)</span>
                    <Calendar size={12} style={{ color: 'var(--text-sub)' }} />
                  </label>
                  <select value={shareExpires} onChange={(e) => setShareExpires(e.target.value)}>
                    <option value="">Never Expires</option>
                    <option value="24">Expires in 24 Hours</option>
                    <option value="168">Expires in 7 Days</option>
                  </select>
                </div>

                <div className="field" style={{ margin: '12px 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontWeight: 600 }}>
                    <span>Download Limit (Optional)</span>
                    <Hash size={12} style={{ color: 'var(--text-sub)' }} />
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 1"
                    value={shareLimit}
                    onChange={(e) => setShareLimit(e.target.value)}
                  />
                  <div className="hint" style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 4 }}>
                    Self-destructs after this many downloads.
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 20 }}>
                  Generate Link
                </button>
              </form>
            ) : (
              <div>
                <div className="alert alert-success" style={{ marginBottom: 16 }}>
                  <CheckCircle2 size={18} />
                  <span>Secure link created!</span>
                </div>
                
                <div className="field" style={{ margin: '12px 0' }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Shared Link URL</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={generatedShareLink}
                      readOnly
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedShareLink);
                        flash('Link copied to clipboard');
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  onClick={() => setShowShareFileModal(false)}
                  style={{ marginTop: 16 }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
