import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, errMessage, downloadBlob, formatBytes } from '../lib/api';
import { FileText, Download, Lock, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface ShareInfo {
  originalName: string;
  size: number;
  mimeType: string;
  category: string;
  ownerName: string;
  isPasswordProtected: boolean;
  isExpired: boolean;
  isLimitReached: boolean;
  expiresAt: string | null;
}

export default function ShareAccess() {
  const { token } = useParams<{ token: string }>();
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadShareInfo();
  }, [token]);

  const loadShareInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/api/shares/info/${token}`);
      setShareInfo(data.share);
    } catch (err) {
      setError(await errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token || !shareInfo) return;

    setDownloading(true);
    setError('');
    try {
      const res = await api.get(`/api/shares/download/${token}`, {
        params: { password: password || undefined },
        responseType: 'blob',
      });

      downloadBlob(res.data, shareInfo.originalName);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(await errMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-gradient)' }}>
        <span className="spinner dark" />
      </div>
    );
  }

  const isLinkDisabled = shareInfo?.isExpired || shareInfo?.isLimitReached;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-gradient)', padding: 24 }}>
      <div className="auth-card" style={{ maxWidth: 480, width: '100%' }}>
        <div className="logo" style={{ justifyContent: 'center' }}>
          <FileText size={28} style={{ color: 'var(--primary)' }} />
          <span>Doc<em>Zen</em></span>
        </div>
        
        <h2 style={{ textAlign: 'center', fontSize: 20, marginBottom: 20 }}>Secure File Share</h2>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ marginBottom: 16 }}>
            <CheckCircle2 size={18} />
            <span>File download started!</span>
          </div>
        )}

        {shareInfo ? (
          <div>
            <div style={{
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginBottom: 20
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 22
              }}>
                📄
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: 'var(--text-main)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {shareInfo.originalName}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 2 }}>
                  {formatBytes(shareInfo.size)} • Shared by {shareInfo.ownerName}
                </div>
              </div>
            </div>

            {isLinkDisabled ? (
              <div className="alert alert-error" style={{ margin: '10px 0' }}>
                <ShieldAlert size={18} />
                <span>
                  {shareInfo.isExpired
                    ? 'This share link has expired.'
                    : 'This share link has reached its download limit.'}
                </span>
              </div>
            ) : shareInfo.isPasswordProtected ? (
              <form onSubmit={handleDownload}>
                <div className="field">
                  <label>
                    <span>Passcode Required</span>
                    <Lock size={14} style={{ color: 'var(--text-sub)' }} />
                  </label>
                  <input
                    type="password"
                    placeholder="Enter download passcode"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <div className="hint">This shared link is protected. Enter the code to download.</div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={downloading}
                  style={{ marginTop: 8 }}
                >
                  {downloading ? (
                    <>
                      <span className="spinner" /> Unlocking…
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>Unlock &amp; Download</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div>
                <button
                  onClick={() => handleDownload()}
                  className="btn btn-primary btn-block"
                  disabled={downloading}
                  style={{ padding: '14px 20px', fontSize: 16 }}
                >
                  {downloading ? (
                    <>
                      <span className="spinner" /> Downloading…
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      <span>Download File</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-sub)', padding: '20px 0' }}>
            Could not fetch shared document details.
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, fontSize: 12, color: 'var(--text-sub)' }}>
        Powered by <strong>DocZen</strong> • Safe &amp; Secure Document Processing
      </div>
    </div>
  );
}
