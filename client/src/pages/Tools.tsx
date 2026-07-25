import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS, CATEGORIES, Tool } from '../lib/tools';
import { Search, Filter } from 'lucide-react';

export default function Tools() {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<'all' | Tool['category']>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((t) => {
      if (activeCat !== 'all' && t.category !== activeCat) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.shortDesc.toLowerCase().includes(q) ||
        t.slug.includes(q)
      );
    });
  }, [query, activeCat]);

  return (
    <>
      <div className="page-head">
        <h1>All Document &amp; PDF Tools</h1>
        <p>Every tool in one place — fast, secure, browser-first processing.</p>
      </div>

      <div className="toolbar">
        <div style={{ position: 'relative', minWidth: 280, flex: 1 }}>
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
            placeholder="Search 17+ tools… (e.g. merge, split, watermark, ocr)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 42, width: '100%' }}
          />
        </div>

        <div className="cat-pills">
          <button
            className={`pill${activeCat === 'all' ? ' active' : ''}`}
            onClick={() => setActiveCat('all')}
          >
            <Filter size={14} />
            <span>All ({TOOLS.length})</span>
          </button>
          {CATEGORIES.map((c) => {
            const count = TOOLS.filter((t) => t.category === c.key).length;
            return (
              <button
                key={c.key}
                className={`pill${activeCat === c.key ? ' active' : ''}`}
                onClick={() => setActiveCat(c.key)}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
                <span style={{ opacity: 0.8, fontSize: 12 }}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="empty">
          <div className="e-icon">🔍</div>
          <p>No tools match “{query}”. Try a different search term or category filter.</p>
        </div>
      )}

      {CATEGORIES.map((cat) => {
        const items = filtered.filter((t) => t.category === cat.key);
        if (!items.length) return null;
        return (
          <section className="tool-cat" key={cat.key}>
            <div className="tool-cat-title">
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className="cat-count">{items.length}</span>
            </div>
            <div className="tool-grid">
              {items.map((t) => (
                <Link to={`/tools/${t.slug}`} className="tool-card" key={t.slug}>
                  <div className="t-icon" style={{ background: t.iconBg }}>
                    {t.icon}
                  </div>
                  <div>
                    <div className="t-name">{t.name}</div>
                    <div className="t-desc">{t.shortDesc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

