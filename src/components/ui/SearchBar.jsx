import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  debounce = 300,
  className = '',
}) {
  const [local, setLocal] = useState(value || '');
  const timerRef = useRef(null);

  useEffect(() => { setLocal(value || ''); }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setLocal(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange?.(val), debounce);
  };

  const handleClear = () => {
    setLocal('');
    onChange?.('');
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-surface-400 pointer-events-none" />
      <input
        type="text"
        value={local}
        onChange={handleChange}
        placeholder={placeholder}
        className="
          w-full h-11 pl-10 pr-9 text-sm text-surface-800 bg-white
          border border-surface-200 rounded-lg shadow-input
          placeholder:text-surface-400
          hover:border-surface-300
          focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 focus:outline-none
          transition-all duration-150
        "
      />
      {local && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
