import { useState, FormEvent } from 'react';
import { api, errMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { User, Key, Save, AlertCircle, CheckCircle2, Lock, Trash2 } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const initials = (user?.name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    setSaving(true);
    try {
      const { data } = await api.put('/api/auth/profile', { name });
      setMsg('Profile updated successfully');
      const stored = JSON.parse(localStorage.getItem('doczen_user') || '{}');
      localStorage.setItem(
        'doczen_user',
        JSON.stringify({ ...stored, name: data.user?.name ?? name })
      );
    } catch (e2) {
      setErr(await errMessage(e2));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwMsg('');
    setPwErr('');
    if (newPw.length < 6) {
      setPwErr('New password must be at least 6 characters');
      return;
    }
    setPwSaving(true);
    try {
      await api.put('/api/auth/change-password', { currentPassword: curPw, newPassword: newPw });
      setPwMsg('Password changed successfully');
      setCurPw('');
      setNewPw('');
    } catch (e2) {
      setPwErr(await errMessage(e2));
    } finally {
      setPwSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm('Delete your account permanently? All files and data will be lost.')) return;
    if (!window.confirm('Are you absolutely sure? This cannot be undone.')) return;
    try {
      await api.delete('/api/auth/account');
      logout();
    } catch (e2) {
      setErr(await errMessage(e2));
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Profile &amp; Account Settings</h1>
        <p>Manage your account identity, security, and preferences.</p>
      </div>

      <div className="two-col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div
                className="avatar"
                style={{
                  width: 56,
                  height: 56,
                  fontSize: 20,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--copper) 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  boxShadow: '0 8px 20px rgba(184, 98, 47, 0.2)',
                }}
              >
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--text-sub)' }}>{user?.email}</div>
              </div>
            </div>

            <div className="section-title">
              <User size={18} style={{ color: 'var(--primary)' }} />
              <span>Personal Details</span>
            </div>

            {msg && (
              <div className="alert alert-success" style={{ marginBottom: 16 }}>
                <CheckCircle2 size={18} />
                <span>{msg}</span>
              </div>
            )}
            {err && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                <AlertCircle size={18} />
                <span>{err}</span>
              </div>
            )}

            <form onSubmit={saveProfile}>
              <div className="field">
                <label>Full name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                />
              </div>
              <div className="field">
                <label>Email address</label>
                <input
                  value={user?.email ?? ''}
                  disabled
                  style={{ background: 'var(--bg-warm)', cursor: 'not-allowed' }}
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner" /> Saving…
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save profile</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="card">
            <div className="section-title">
              <Lock size={18} style={{ color: 'var(--primary)' }} />
              <span>Change Password</span>
            </div>

            {pwMsg && (
              <div className="alert alert-success" style={{ marginBottom: 16 }}>
                <CheckCircle2 size={18} />
                <span>{pwMsg}</span>
              </div>
            )}
            {pwErr && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                <AlertCircle size={18} />
                <span>{pwErr}</span>
              </div>
            )}

            <form onSubmit={changePassword}>
              <div className="field">
                <label>Current password</label>
                <input
                  type="password"
                  value={curPw}
                  onChange={(e) => setCurPw(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>New password</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={pwSaving}>
                {pwSaving ? (
                  <>
                    <span className="spinner" /> Updating…
                  </>
                ) : (
                  <>
                    <Key size={16} />
                    <span>Change password</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="section-title" style={{ color: 'var(--error)' }}>
            <Trash2 size={18} />
            <span>Danger Zone</span>
          </div>
          <p style={{ color: 'var(--text-sub)', fontSize: 13.5, marginBottom: 18, lineHeight: 1.5 }}>
            Deleting your account permanently removes all your uploaded files, process logs, and stored settings. This action cannot be undone.
          </p>
          <button className="btn btn-danger" onClick={deleteAccount}>
            Delete account permanently
          </button>
        </div>
      </div>
    </>
  );
}
