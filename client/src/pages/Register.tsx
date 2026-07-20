import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, errMessage } from '../lib/api';
import AuthShell from '../components/AuthShell';
import { UserPlus, AlertCircle } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/auth/register', { name, email, password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(await errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your account" sub="Get instant access to all 17+ document tools">
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
          />
        </div>

        <div className="field">
          <label>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            required
            minLength={6}
          />
        </div>

        <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" /> Creating account…
            </>
          ) : (
            <>
              <UserPlus size={18} />
              <span>Create Account</span>
            </>
          )}
        </button>
      </form>

      <div style={{ marginTop: 24, fontSize: 14, color: 'var(--text-sub)', textAlign: 'center' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ fontWeight: 700, color: 'var(--primary)' }}>
          Sign in
        </Link>
      </div>
    </AuthShell>
  );
}

