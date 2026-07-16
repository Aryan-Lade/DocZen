import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatBytes, formatDate } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { TOOLS } from '../lib/tools';

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

const catIcons: Record<string, string> = {
  pdf: '📄', image: '🖼️', word: '📝', excel: '📊', ppt: '📽️', text: '📃', other: '📦',
};

const popularTools = ['pdf-merge', 'pdf-compress', 'ocr', 'language-detect', 'image-convert', 'pdf-watermark'];

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
    return <div className="center-load"><span className="spinner dark" /></div>;
  }

  const used = stats?.storageUsed ?? 0;
  const limit = stats?.storageLimit || 1;
  const pct = Math.min(100, Math.round((used / limit) * 100));

  return (
    <>
      <div className="page-head">
        <h1>Hi, {user?.name?.split(' ')[0]} 👋</h1>
        <p>Here's what's happening in your workspace.</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="s-icon">📁</div>
          <div className="s-label">Total files</div>
          <div className="s-value">{stats?.totalFiles ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="s-icon">💾</div>
          <div className="s-label">Storage used</div>
          <div className="s-value">{formatBytes(used)}</div>
          <div className="progress"><div style={{ width: `${pct}%` }} /></div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
            {pct}% of {formatBytes(limit)}
          </div>
        </div>
        <div className="stat-card">
          <div className="s-icon">🧰</div>
          <div className="s-label">Available tools</div>
          <div className="s-value">{TOOLS.length}</div>
        </div>
        <div className="stat-card">
          <div className="s-icon">⚡</div>
          <div className="s-label">Recent operations</div>
          <div className="s-value">{activity.length}</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="section-title">Popular tools</div>
          <div className="tool-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {popularTools.map((slug) => {
              const t = TOOLS.find((x) => x.slug === slug)!;
              return (
                <Link to={`/tools/${t.slug}`} className="tool-card" key={t.slug} style={{ boxShadow: 'none' }}>
                  <div className="t-icon" style={{ background: t.iconBg }}>{t.icon}</div>
                  <div>
                    <div className="t-name">{t.name}</div>
                    <div className="t-desc">{t.shortDesc}</div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div style={{ marginTop: 14, textAlign: 'right' }}>
            <Link to="/tools" style={{ fontSize: 13.5, fontWeight: 600 }}>View all tools →</Link>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Recent activity</div>
          {activity.length === 0 ? (
            <div className="empty">
              <div className="e-icon">🕑</div>
              No activity yet — run a tool to get started!
            </div>
          ) : (
            activity.map((a) => (
              <div className="act-row" key={a.id}>
                <div className="a-icon">⚙️</div>
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
              <div className="section-title" style={{ marginTop: 20 }}>Recent files</div>
              {stats.recentDocs.map((d) => (
                <div className="act-row" key={d.id}>
                  <div className="a-icon">{catIcons[d.category] ?? '📦'}</div>
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
