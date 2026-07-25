import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatBytes, formatDate } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { TOOLS } from '../lib/tools';
import {
  Files as FilesIcon,
  HardDrive,
  Wrench,
  Zap,
  ArrowRight,
  Clock,
  FileText,
} from 'lucide-react';

interface Stats {
  totalFiles: number;
  storageUsed: number;
  storageLimit: number;
  categoryBreakdown: { category: string; count: number; totalSize: number }[];
  recentDocs: { id: number; originalName: string; size: number; category: string; createdAt: string }[];
}

interface ActivityItem {
  id: number;
  operation: string;
  fileName: string;
  status: string;
  createdAt: string;
}

const popularTools = ['pdf-merge', 'pdf-edit', 'pdf-compress', 'image-to-pdf', 'ocr', 'qr-code'];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/api/files/stats'),
      api.get('/api/activity', { params: { limit: 6 } }),
    ]).then(([s, a]) => {
      if (s.status === 'fulfilled') setStats(s.value.data.stats);
      if (a.status === 'fulfilled') setActivity(a.value.data.activities);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="center-load">
        <span className="spinner dark" />
      </div>
    );
  }

  const used = stats?.storageUsed ?? 0;
  const limit = stats?.storageLimit || 1;
  const pct = Math.min(100, Math.round((used / limit) * 100));

  return (
    <>
      <div className="page-head">
        <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p>Manage, convert, split, edit and transform your documents with ease.</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="s-top">
            <span className="s-label">Total Files</span>
            <div className="s-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <FilesIcon size={20} />
            </div>
          </div>
          <div className="s-value">{stats?.totalFiles ?? 0}</div>
        </div>

        <div className="stat-card">
          <div className="s-top">
            <span className="s-label">Storage Used</span>
            <div className="s-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
              <HardDrive size={20} />
            </div>
          </div>
          <div className="s-value">{formatBytes(used)}</div>
          <div className="progress">
            <div style={{ width: `${pct}%` }} />
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-sub)', marginTop: 8, fontWeight: 500 }}>
            {pct}% of {formatBytes(limit)} used
          </div>
        </div>

        <div className="stat-card">
          <div className="s-top">
            <span className="s-label">Available Tools</span>
            <div className="s-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Wrench size={20} />
            </div>
          </div>
          <div className="s-value">{TOOLS.length}</div>
        </div>

        <div className="stat-card">
          <div className="s-top">
            <span className="s-label">Recent Operations</span>
            <div className="s-icon" style={{ background: '#fff1f2', color: '#e11d48' }}>
              <Zap size={20} />
            </div>
          </div>
          <div className="s-value">{activity.length}</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="section-title">
            <Wrench size={18} style={{ color: 'var(--primary)' }} />
            <span>Popular Document Tools</span>
          </div>
          <div
            className="tool-grid"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}
          >
            {popularTools.map((slug) => {
              const t = TOOLS.find((x) => x.slug === slug)!;
              if (!t) return null;
              return (
                <Link to={`/tools/${t.slug}`} className="tool-card" key={t.slug}>
                  <div className="t-icon" style={{ background: t.iconBg }}>
                    {t.icon}
                  </div>
                  <div>
                    <div className="t-name">{t.name}</div>
                    <div className="t-desc">{t.shortDesc}</div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div style={{ marginTop: 20, textAlign: 'right' }}>
            <Link
              to="/tools"
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>Explore all 17+ tools</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="section-title">
            <Clock size={18} style={{ color: 'var(--primary)' }} />
            <span>Recent Activity</span>
          </div>

          {activity.length === 0 ? (
            <div className="empty">
              <div className="e-icon">🕑</div>
              <p>No activity recorded yet — run a tool to get started!</p>
            </div>
          ) : (
            activity.map((a) => (
              <div className="act-row" key={a.id}>
                <div className="a-icon">
                  <Zap size={18} style={{ color: 'var(--primary)' }} />
                </div>
                <div className="a-body">
                  <div className="a-op">{a.operation}</div>
                  <div className="a-file">{a.fileName}</div>
                </div>
                <div className="a-time">{formatDate(a.createdAt)}</div>
              </div>
            ))
          )}

          {stats && stats.recentDocs.length > 0 && (
            <>
              <div className="section-title" style={{ marginTop: 24 }}>
                <FilesIcon size={18} style={{ color: 'var(--primary)' }} />
                <span>Recent Files</span>
              </div>
              {stats.recentDocs.map((d) => (
                <div className="act-row" key={d.id}>
                  <div className="a-icon">
                    <FileText size={18} style={{ color: 'var(--text-sub)' }} />
                  </div>
                  <div className="a-body">
                    <div className="a-op">{d.originalName}</div>
                    <div className="a-file">{formatBytes(d.size)}</div>
                  </div>
                  <div className="a-time">{formatDate(d.createdAt)}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

