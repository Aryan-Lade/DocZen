import { ReactNode } from 'react';

const FEATURES = [
  'Merge & Split PDFs',
  'Compress files',
  'Password protect',
  'Watermarks',
  'OCR text extraction',
  'Image conversion',
  'Office → PDF',
  'Language detection',
];

export default function AuthShell({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="auth-wrap">
      <div className="auth-hero">
        <h1>
          Every document tool,
          <br />
          one calm workspace.
        </h1>
        <p>
          DocZen brings 17+ PDF, image, OCR and conversion tools together — fast, private and simple.
        </p>
        <div className="hero-badges">
          {FEATURES.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <div className="logo">
            📄 Doc<em>Zen</em>
          </div>
          <h2>{title}</h2>
          <div className="sub">{sub}</div>
          {children}
        </div>
      </div>
    </div>
  );
}
