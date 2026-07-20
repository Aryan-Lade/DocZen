import { ReactNode } from 'react';
import { FileText, CheckCircle2, Sparkles } from 'lucide-react';

const FEATURES = [
  'Merge & Split PDFs',
  'Compress Document Size',
  'Password Encryption',
  'Custom Watermarks',
  'OCR Text Extraction',
  'Image to PDF Convert',
  'Office to PDF Suite',
  'Language Detection',
];

export default function AuthShell({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <div className="auth-wrap">
      <div className="auth-hero">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: 13, fontWeight: 600, marginBottom: 20, backdropFilter: 'blur(8px)' }}>
          <Sparkles size={16} style={{ color: '#fbbf24' }} />
          <span>Professional PDF &amp; Document Suite</span>
        </div>
        <h1>
          Every document tool,
          <br />
          one calm workspace.
        </h1>
        <p>
          DocZen brings 17+ powerful PDF, image, OCR, and conversion tools together in a fast, private, and beautifully styled browser-first experience.
        </p>
        <div className="hero-badges">
          {FEATURES.map((f) => (
            <span key={f}>
              <CheckCircle2 size={14} style={{ color: 'var(--copper)' }} />
              <span>{f}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div className="brand-mark">
              <FileText size={20} strokeWidth={2.5} />
            </div>
            <span>
              Doc<em>Zen</em>
            </span>
          </div>
          <h2>{title}</h2>
          <div className="sub">{sub}</div>
          {children}
        </div>
      </div>
    </div>
  );
}

