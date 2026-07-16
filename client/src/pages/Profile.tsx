import { useState, FormEvent } from 'react';
import { api, errMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

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

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(''); setErr(''); setSaving(true);
    try {
      const { data } = await api.put('/api/auth/profile', { name });
      setMsg('Profile updated');
      // Keep local user in sync
      const stored = JSON.parse(localStorage.getItem('doczen_user') || '{}');
      localStorage.setItem('doczen_user', JSON.stringify({ ...stored, name: data.user?.name ?? name }));
    } catch (e2) {
      setErr(await errMessage(e2));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwMsg(''); setPwErr('');
    if (newPw.length < 6) { setPwErr('New password must be at least 6 characters'); return; }
    setPwSaving(true);
    try {
      await api.put('/api/auth/change-password', { currentPassword: curPw, newPassword: newPw });
      setPwMsg('Password changed successfully');
      setCurPw(''); setNewPw('');
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
        <h1>Profile & Settings</h1>
        <p>Manage your account details.</p>
      </div>

      <div className="two-col">
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="section-title">Profile</div>
            {msg && <div className="alert alert-success">{msg}</div>}
            {err && <div className="alert alert-error">{err}</div>}
            <form onSubmit={saveProfile}>
              <div className="field">
                <label>Full name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="field">
                <label>Email</label>
                <input value={user?.email ?? ''} disabled style={{ background: 'var(--surface-2)' }} />
              </div>
              <button className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : 'Save changes'}
              </button>
            </form>
          </div>

          <div className="card">
            <div className="section-title">Change password</div>
            {pwMsg && <div className="alert alert-success">{pwMsg}</div>}
            {pwErr && <div className="alert alert-error">{pwErr}</div>}
            <form onSubmit={changePassword}>
              <div className="field">
                <label>Current password</label>
                <input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} required />
              </div>
              <div className="field">
                <label>New password</label>
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
              </div>
              <button className="btn btn-primary" disabled={pwSaving}>
                {pwSaving ? <span className="spinner" /> : 'Change password'}
              </button>
            </form>
          </div>
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="section-title">Danger zone</div>
          <p style={{ color: 'var(--text-2)', fontSize: 13.5, marginBottom: 14 }}>
            Deleting your account removes all your files, activity and settings permanently.
          </p>
          <button className="btn btn-danger" onClick={deleteAccount}>Delete account</button>
        </div>
      </div>
    </>
  );
}
