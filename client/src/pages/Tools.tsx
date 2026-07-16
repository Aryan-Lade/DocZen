import { Link } from 'react-router-dom';
import { TOOLS, CATEGORIES } from '../lib/tools';

export default function Tools() {
  return (
    <>
      <div className="page-head">
        <h1>All Tools</h1>
        <p>Every document tool in one place — pick one to get started.</p>
      </div>
      {CATEGORIES.map((cat) => {
        const items = TOOLS.filter((t) => t.category === cat.key);
        if (!items.length) return null;
        return (
          <section className="tool-cat" key={cat.key}>
            <h2>
              <span>{cat.icon}</span> {cat.label}
            </h2>
            <div className="tool-grid">
              {items.map((t) => (
                <Link to={`/tools/${t.slug}`} className="tool-card" key={t.slug}>
                  <div className="t-icon" style={{ background: t.iconBg }}>{t.icon}</div>
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
