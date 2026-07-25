import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, errMessage } from '../lib/api';
import AuthShell from '../components/AuthShell';
import { LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/api/auth/login', { email, password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(await errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" sub="Sign in to your DocZen account to continue">
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>

        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>

        <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" /> Signing in…
            </>
          ) : (
            <>
              <LogIn size={18} />
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>

      <div style={{ marginTop: 24, fontSize: 14, color: 'var(--text-sub)', textAlign: 'center' }}>
        Don't have an account?{' '}
        <Link to="/register" style={{ fontWeight: 700, color: 'var(--primary)' }}>
          Create an account
        </Link>
      </div>
    </AuthShell>
  );
}
