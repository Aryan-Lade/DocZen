import { useRef, useState, DragEvent } from 'react';
import { formatBytes } from '../lib/api';

interface Props {
  accept: string;
  multiple: boolean;
  files: File[];
  onChange: (files: File[]) => void;
}

export default function Dropzone({ accept, multiple, files, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    onChange(multiple ? [...files, ...incoming] : incoming.slice(0, 1));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    addFiles(e.dataTransfer.files);
  };

  const removeAt = (i: number) => {
    onChange(files.filter((_, idx) => idx !== i));
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= files.length) return;
    const next = [...files];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <div
        className={`dropzone${drag ? ' drag' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        <div className="dz-icon">📤</div>
        <div className="dz-title">{drag ? 'Drop it here' : 'Click or drag files here'}</div>
        <div className="dz-sub">
          {multiple ? 'Multiple files supported' : 'Single file'} · {accept.replaceAll(',', ', ')}
        </div>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={accept}
          multiple={multiple}
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
        />
      </div>
      {files.length > 0 && (
        <div className="file-chips">
          {files.map((f, i) => (
            <div className="file-chip" key={`${f.name}-${i}`}>
              <span>📄</span>
              <span className="fc-name">{f.name}</span>
              <span className="fc-size">{formatBytes(f.size)}</span>
              {multiple && files.length > 1 && (
                <>
                  <button type="button" onClick={() => move(i, -1)} title="Move up" disabled={i === 0}>↑</button>
                  <button type="button" onClick={() => move(i, 1)} title="Move down" disabled={i === files.length - 1}>↓</button>
                </>
              )}
              <button type="button" onClick={() => removeAt(i)} title="Remove">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
