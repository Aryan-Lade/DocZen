import { useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { api, errMessage, downloadBlob, formatBytes } from '../lib/api';
import { toolBySlug, Tool, ToolField } from '../lib/tools';
import Dropzone from '../components/Dropzone';
import {
  Sliders,
  Play,
  CheckCircle2,
  Download,
  Copy,
  Globe,
  AlertCircle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

type Result =
  | {
      kind: 'download';
      filename: string;
      originalSize?: number;
      compressedSize?: number;
      targetBytes?: number | null;
      targetMet?: boolean;
    }
  | { kind: 'ocr'; text: string; confidence: string; wordCount: number }
  | {
      kind: 'language';
      detected: { code: string; name: string; native: string; confidence: number };
      candidates: { code: string; name: string; native: string; confidence: number }[];
      stats: { characters: number; words: number };
    }
  | { kind: 'filelist'; message: string; files: { name: string; path: string }[] }
  | { kind: 'wordcount'; stats: { words: number; characters: number; charactersNoSpaces: number; lines: number; sentences: number; paragraphs: number; readingTimeMin: number } }
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

  // Compress-PDF only: how much to reduce the file by.
  const isCompress = tool?.slug === 'pdf-compress';
  const [compressMode, setCompressMode] = useState<'percent' | 'size'>('percent');
  const [reducePercent, setReducePercent] = useState(50);
  const [targetValue, setTargetValue] = useState('1');
  const [targetUnit, setTargetUnit] = useState<'KB' | 'MB'>('MB');

  const originalSize = files[0]?.size ?? 0;
  const targetSizeBytes = targetUnit === 'MB'
    ? Math.round(parseFloat(targetValue || '0') * 1024 * 1024)
    : Math.round(parseFloat(targetValue || '0') * 1024);
  const estimatedTarget = compressMode === 'percent'
    ? Math.round(originalSize * (1 - reducePercent / 100))
    : targetSizeBytes;

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
    // No file — if the tool has a text field, require it
    if (tool.fields.some((f) => f.name === 'text')) return (values.text ?? '').trim().length > 0;
    return true;
  };

  const buildFormData = (t: Tool): FormData => {
    const fd = new FormData();
    if (t.fileMode === 'multi') {
      files.forEach((f) => fd.append(t.fileFieldName, f));
    } else if (files[0]) {
      fd.append(t.fileFieldName, files[0]);
    }
    // Compress PDF: send the reduction target the user chose.
    if (t.slug === 'pdf-compress') {
      fd.append('mode', compressMode);
      if (compressMode === 'percent') {
        fd.append('targetPercent', String(reducePercent));
      } else {
        fd.append('targetBytes', String(targetSizeBytes));
      }
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
        } else if (tool.resultKind === 'wordcount') {
          setResult({ kind: 'wordcount', stats: data.stats });
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
        const os = Number(res.headers['x-original-size']);
        const cs = Number(res.headers['x-compressed-size']);
        const tb = res.headers['x-target-bytes'];
        const tm = res.headers['x-target-met'];
        setResult({
          kind: 'download',
          filename,
          originalSize: isFinite(os) && os > 0 ? os : undefined,
          compressedSize: isFinite(cs) && cs > 0 ? cs : undefined,
          targetBytes: tb ? Number(tb) : null,
          targetMet: tm === undefined ? undefined : tm === 'true',
        });
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
          <Link to="/tools">All Tools</Link>
          <ChevronRight size={14} />
          <span>{tool.name}</span>
        </div>
        <h1>
          <span>{tool.icon}</span>
          <span>{tool.name}</span>
        </h1>
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

          {error && (
            <div className="alert alert-error" style={{ marginTop: 20 }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="result-card">
              <ResultView result={result} />
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-title">
            <Sliders size={18} style={{ color: 'var(--primary)' }} />
            <span>Options &amp; Parameters</span>
          </div>

          {isCompress && (
            <div className="compress-panel">
              {originalSize > 0 ? (
                <div className="cp-orig">
                  <span className="cp-orig-label">Original size</span>
                  <span className="cp-orig-value">{formatBytes(originalSize)}</span>
                </div>
              ) : (
                <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 16 }}>
                  Upload a PDF to choose how much to reduce it.
                </p>
              )}

              <div className="seg">
                <button
                  type="button"
                  className={compressMode === 'percent' ? 'active' : ''}
                  onClick={() => setCompressMode('percent')}
                >
                  By percent
                </button>
                <button
                  type="button"
                  className={compressMode === 'size' ? 'active' : ''}
                  onClick={() => setCompressMode('size')}
                >
                  By target size
                </button>
              </div>

              {compressMode === 'percent' ? (
                <div className="field">
                  <label>Reduce by — {reducePercent}%</label>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={5}
                    value={reducePercent}
                    onChange={(e) => setReducePercent(Number(e.target.value))}
                  />
                </div>
              ) : (
                <div className="field">
                  <label>Target size</label>
                  <div className="cp-size-row">
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                    />
                    <select value={targetUnit} onChange={(e) => setTargetUnit(e.target.value as 'KB' | 'MB')}>
                      <option value="KB">KB</option>
                      <option value="MB">MB</option>
                    </select>
                  </div>
                </div>
              )}

              {originalSize > 0 && estimatedTarget > 0 && (
                <div className="cp-estimate">
                  {formatBytes(originalSize)} <span className="cp-arrow">→</span>{' '}
                  <strong>~{formatBytes(Math.max(0, Math.min(estimatedTarget, originalSize)))}</strong>
                  <span className="cp-note"> (best-effort target)</span>
                </div>
              )}
            </div>
          )}

          {!isCompress && visibleFields.length === 0 && (
            <p style={{ color: 'var(--text-sub)', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
              No custom options required for this tool — simply upload your file and click run below.
            </p>
          )}

          {visibleFields.map((f) => (
            <div className="field" key={f.name}>
              <label>{f.label}</label>
              <FieldInput field={f} value={values[f.name] ?? ''} onChange={(v) => setValue(f.name, v)} />
              {f.hint && <div className="hint">{f.hint}</div>}
            </div>
          ))}

          <button className="btn btn-primary btn-block btn-lg" onClick={run} disabled={!canRun()}>
            {loading ? (
              <>
                <span className="spinner" /> Processing…
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" />
                <span>Run {tool.name}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

function ResultView({ result }: { result: Result }) {
  const [copied, setCopied] = useState(false);

  if (result.kind === 'download') {
    const hasSizes = result.originalSize != null && result.compressedSize != null;
    const saved = hasSizes ? result.originalSize! - result.compressedSize! : 0;
    const savedPct = hasSizes && result.originalSize! > 0
      ? Math.round((saved / result.originalSize!) * 100)
      : 0;
    return (
      <div>
        <div className="result-ok">
          <div className="r-icon">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="r-title">Processing Complete!</div>
            <div className="r-sub">Your file has been downloaded as {result.filename}</div>
          </div>
        </div>
        {hasSizes && (
          <div className="compress-result">
            <div className="cr-row">
              <div className="cr-cell">
                <div className="cr-label">Original</div>
                <div className="cr-value">{formatBytes(result.originalSize!)}</div>
              </div>
              <div className="cr-arrow">→</div>
              <div className="cr-cell">
                <div className="cr-label">Compressed</div>
                <div className="cr-value cr-green">{formatBytes(result.compressedSize!)}</div>
              </div>
              <div className="cr-cell">
                <div className="cr-label">Saved</div>
                <div className="cr-value cr-green">{savedPct}%</div>
              </div>
            </div>
            {result.targetBytes != null && result.targetBytes > 0 && result.targetMet === false && (
              <div className="cr-warn">
                ⚠️ Couldn't reach the {formatBytes(result.targetBytes)} target — this is the smallest
                achievable size without further quality loss.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (result.kind === 'ocr') {
    const handleCopy = () => {
      navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div>
        <div className="result-ok">
          <div className="r-icon">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="r-title">Text Extracted Successfully</div>
            <div className="r-sub">{result.wordCount} words extracted · {result.confidence}% confidence</div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={handleCopy}
          >
            <Copy size={14} />
            <span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>
        </div>
        <div className="ocr-box">{result.text || '(no text detected in document)'}</div>
      </div>
    );
  }

  if (result.kind === 'language') {
    return (
      <div>
        <div className="lang-top">
          <div className="lt-flag">
            <Globe size={32} style={{ color: 'var(--primary)' }} />
          </div>
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
            <div className="c-bar">
              <div style={{ width: `${c.confidence}%` }} />
            </div>
            <span className="c-val">{c.confidence}%</span>
          </div>
        ))}
        <p style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 14 }}>
          Analyzed {result.stats.words} words ({result.stats.characters} characters)
        </p>
      </div>
    );
  }

  if (result.kind === 'wordcount') {
    const s = result.stats;
    const rows: [string, string | number][] = [
      ['Words', s.words],
      ['Characters', s.characters],
      ['Characters (no spaces)', s.charactersNoSpaces],
      ['Sentences', s.sentences],
      ['Paragraphs', s.paragraphs],
      ['Lines', s.lines],
      ['Reading time', `~${s.readingTimeMin} min`],
    ];
    return (
      <div>
        <div className="result-ok">
          <div className="r-icon">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="r-title">Text Analysis Complete</div>
            <div className="r-sub">{s.words} words · {s.characters} characters</div>
          </div>
        </div>
        <div className="dl-list" style={{ marginTop: 16 }}>
          {rows.map(([label, value]) => (
            <div className="cand-row" key={label}>
              <span className="c-name" style={{ width: 220 }}>{label}</span>
              <span className="c-val" style={{ width: 'auto', textAlign: 'left', fontWeight: 700 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (result.kind === 'filelist') {
    return (
      <div>
        <div className="result-ok">
          <div className="r-icon">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="r-title">{result.message}</div>
            <div className="r-sub">Click below to download each generated file</div>
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
              <Download size={16} />
              <span>{f.name}</span>
              <ExternalLink size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="result-ok">
      <div className="r-icon">
        <CheckCircle2 size={24} />
      </div>
      <div>
        <div className="r-title">{result.message}</div>
      </div>
    </div>
  );
}
