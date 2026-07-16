import { useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { api, errMessage, downloadBlob } from '../lib/api';
import { toolBySlug, Tool, ToolField } from '../lib/tools';
import Dropzone from '../components/Dropzone';

type Result =
  | { kind: 'download'; filename: string }
  | { kind: 'ocr'; text: string; confidence: string; wordCount: number }
  | {
      kind: 'language';
      detected: { code: string; name: string; native: string; confidence: number };
      candidates: { code: string; name: string; native: string; confidence: number }[];
      stats: { characters: number; words: number };
    }
  | { kind: 'filelist'; message: string; files: { name: string; path: string }[] }
  | { kind: 'generic'; message: string };

const apiBase = (import.meta.env.VITE_API_URL as string) || '';

function FieldInput({ field, value, onChange }: { field: ToolField; value: string; onChange: (v: string) => void }) {
  if (field.type === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {field.options?.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }
  if (field.type === 'textarea') {
    return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />;
  }
  return (
    <input
      type={field.type === 'color' ? 'color' : field.type === 'number' ? 'number' : 'text'}
      value={value}
      min={field.min}
      max={field.max}
      step={field.step}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function ToolRunner() {
  const { slug } = useParams();
  const tool = useMemo(() => (slug ? toolBySlug(slug) : undefined), [slug]);

  const [files, setFiles] = useState<File[]>([]);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    tool?.fields.forEach((f) => { init[f.name] = f.defaultValue ?? ''; });
    return init;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  if (!tool) return <Navigate to="/tools" replace />;

  const visibleFields = tool.fields.filter(
    (f) => !f.showWhen || values[f.showWhen.field] === f.showWhen.equals
  );

  const setValue = (name: string, v: string) => setValues((prev) => ({ ...prev, [name]: v }));

  const canRun = () => {
    if (loading) return false;
    if (tool.fileMode === 'multi') return files.length >= (tool.minFiles ?? 2);
    if (tool.fileMode === 'single') return files.length === 1;
    if (tool.fileMode === 'optional') return files.length === 1 || (values.text ?? '').trim().length > 0;
    return true;
  };

  const buildFormData = (t: Tool): FormData => {
    const fd = new FormData();
    if (t.fileMode === 'multi') {
      files.forEach((f) => fd.append(t.fileFieldName, f));
    } else if (files[0]) {
      fd.append(t.fileFieldName, files[0]);
    }
    for (const field of visibleFields) {
      const v = values[field.name];
      if (v === undefined || v === '') continue;
      // Special mapping: reorder tool takes JSON array in `order`
      if (t.slug === 'pdf-reorder' && field.name === 'orderText') {
        const arr = v.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
        fd.append('order', JSON.stringify(arr));
        continue;
      }
      fd.append(field.name, v);
    }
    return fd;
  };

  const run = async () => {
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const fd = buildFormData(tool);
      const res = await api.post(tool.endpoint, fd, {
        responseType: 'blob',
        timeout: 5 * 60 * 1000,
      });

      const contentType: string = (res.headers['content-type'] as string) || '';
      if (contentType.includes('application/json')) {
        // JSON result (OCR, language, file lists)
        const data = JSON.parse(await (res.data as Blob).text());
        if (tool.resultKind === 'ocr') {
          setResult({ kind: 'ocr', text: data.text, confidence: data.confidence, wordCount: data.wordCount });
        } else if (tool.resultKind === 'language') {
          setResult({ kind: 'language', detected: data.detected, candidates: data.candidates, stats: data.stats });
        } else if (data.files) {
          setResult({ kind: 'filelist', message: data.message, files: data.files });
        } else {
          setResult({ kind: 'generic', message: data.message || 'Done!' });
        }
      } else {
        // Binary download
        const cd: string = res.headers['content-disposition'] || '';
        const match = cd.match(/filename="?([^";]+)"?/);
        const filename = match?.[1] || tool.downloadName || 'result';
        downloadBlob(res.data as Blob, filename);
        setResult({ kind: 'download', filename });
      }
    } catch (err) {
      setError(await errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="crumb">
          <Link to="/tools">All Tools</Link> / {tool.name}
        </div>
        <h1>{tool.icon} {tool.name}</h1>
        <p>{tool.shortDesc}{tool.helpText ? ` — ${tool.helpText}` : ''}</p>
      </div>

      <div className="tool-layout">
        <div className="card">
          {tool.fileMode !== 'none' && (
            <Dropzone
              accept={tool.accept}
              multiple={tool.fileMode === 'multi'}
              files={files}
              onChange={setFiles}
            />
          )}

          {error && <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>}

          {result && (
            <div className="result-card">
              <ResultView result={result} />
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-title">Options</div>
          {visibleFields.length === 0 && (
            <p style={{ color: 'var(--text-2)', fontSize: 13.5, marginBottom: 16 }}>
              No options needed — just upload and run.
            </p>
          )}
          {visibleFields.map((f) => (
            <div className="field" key={f.name}>
              <label>{f.label}</label>
              <FieldInput field={f} value={values[f.name] ?? ''} onChange={(v) => setValue(f.name, v)} />
              {f.hint && <div className="hint">{f.hint}</div>}
            </div>
          ))}
          <button className="btn btn-primary btn-block" onClick={run} disabled={!canRun()}>
            {loading ? (<><span className="spinner" /> Processing…</>) : `Run ${tool.name}`}
          </button>
        </div>
      </div>
    </>
  );
}

function ResultView({ result }: { result: Result }) {
  if (result.kind === 'download') {
    return (
      <div className="result-ok">
        <div className="r-icon">✅</div>
        <div>
          <div className="r-title">Done — download started</div>
          <div className="r-sub">Saved as {result.filename}</div>
        </div>
      </div>
    );
  }

  if (result.kind === 'ocr') {
    return (
      <div>
        <div className="result-ok">
          <div className="r-icon">✅</div>
          <div>
            <div className="r-title">Text extracted</div>
            <div className="r-sub">{result.wordCount} words · {result.confidence}% confidence</div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => navigator.clipboard.writeText(result.text)}
          >
            Copy
          </button>
        </div>
        <div className="ocr-box">{result.text || '(no text found)'}</div>
      </div>
    );
  }

  if (result.kind === 'language') {
    return (
      <div>
        <div className="lang-top">
          <div className="lt-flag">🌍</div>
          <div>
            <div className="lt-name">{result.detected.name}</div>
            <div className="lt-native">{result.detected.native}</div>
          </div>
          <div className="lt-conf">
            <div className="v">{result.detected.confidence}%</div>
            <div className="l">confidence</div>
          </div>
        </div>
        {result.candidates.map((c) => (
          <div className="cand-row" key={c.code}>
            <span className="c-name">{c.name}</span>
            <div className="c-bar"><div style={{ width: `${c.confidence}%` }} /></div>
            <span className="c-val">{c.confidence}%</span>
          </div>
        ))}
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 10 }}>
          Analyzed {result.stats.words} words ({result.stats.characters} characters)
        </p>
      </div>
    );
  }

  if (result.kind === 'filelist') {
    return (
      <div>
        <div className="result-ok">
          <div className="r-icon">✅</div>
          <div>
            <div className="r-title">{result.message}</div>
            <div className="r-sub">Click each file to download</div>
          </div>
        </div>
        <div className="dl-list">
          {result.files.map((f) => (
            <a
              key={f.path}
              className="dl-item"
              href={`${apiBase}/uploads/${f.path}`}
              target="_blank"
              rel="noreferrer"
              download={f.name}
            >
              ⬇️ {f.name}
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="result-ok">
      <div className="r-icon">✅</div>
      <div><div className="r-title">{result.message}</div></div>
    </div>
  );
}
