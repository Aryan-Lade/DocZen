import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minWidth?: number | string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  minWidth = 280,
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Detect OS for shortcut badge
    const ua = navigator.userAgent.toLowerCase();
    setIsMac(ua.indexOf('mac') !== -1);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on Ctrl+K (Windows/Linux) or Cmd+K (Mac) or '/' key
      const isSearchShortcut =
        (e.key === 'k' && (e.ctrlKey || e.metaKey)) ||
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA');

      if (isSearchShortcut) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const shortcutText = isMac ? '⌘K' : 'Ctrl+K';

  return (
    <div
      className={`search-wrapper ${focused ? 'focused' : ''} ${!value ? 'no-clear' : ''}`}
      style={{ minWidth }}
    >
      <div className="search-icon-wrapper">
        <Search size={18} strokeWidth={2.2} />
      </div>
      <input
        ref={inputRef}
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {value && (
        <button
          type="button"
          className="search-clear-btn"
          onClick={handleClear}
          title="Clear search"
          aria-label="Clear search"
        >
          <X size={13} strokeWidth={3} />
        </button>
      )}
      <div className="search-shortcut-badge" title={`Press ${shortcutText} or / to focus`}>
        {shortcutText}
      </div>
    </div>
  );
}
