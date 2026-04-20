import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import { Zap, Hash, MessageSquare, ChevronRight, Search, Loader2 } from 'lucide-react';

const CATEGORY_COLORS = {
  general: 'bg-surface-100 text-surface-600',
  greeting: 'bg-emerald-50 text-emerald-700',
  support: 'bg-blue-50 text-blue-700',
  sales: 'bg-violet-50 text-violet-700',
  follow_up: 'bg-amber-50 text-amber-700',
  closing: 'bg-rose-50 text-rose-700',
};

/**
 * QuickReplyPopup — attach to any textarea/input.
 *
 * Props:
 *  - text          : current value of the input
 *  - onSelect      : (messageText, quickReplyId) => void — called when user picks a reply
 *  - inputRef      : ref to the textarea/input element (used for positioning)
 *  - position      : 'above' | 'below' (default 'above')
 */
export default function QuickReplyPopup({ text, onSelect, inputRef, position = 'above' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const popupRef = useRef(null);
  const fetchTimer = useRef(null);

  // Detect "/" trigger at start of text or after whitespace
  useEffect(() => {
    if (!text) { setOpen(false); setQuery(''); return; }

    // Check if text starts with "/" or has " /" pattern
    const slashMatch = text.match(/(?:^|\s)\/(\S*)$/);
    if (slashMatch) {
      const searchTerm = slashMatch[1] || '';
      setQuery(searchTerm);
      setOpen(true);
      setActiveIndex(0);
    } else {
      setOpen(false);
      setQuery('');
    }
  }, [text]);

  // Fetch quick replies when query changes
  useEffect(() => {
    if (!open) return;

    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    fetchTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/quick-replies/search/shortcut', {
          params: { q: query },
        });
        setResults(data?.data?.quick_replies || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => { if (fetchTimer.current) clearTimeout(fetchTimer.current); };
  }, [open, query]);

  // Handle keyboard navigation in the popup
  const handleKeyDown = useCallback((e) => {
    if (!open || !results.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      selectReply(results[activeIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      selectReply(results[activeIndex]);
    }
  }, [open, results, activeIndex]);

  // Attach keyboard listener to the input element
  useEffect(() => {
    const el = inputRef?.current;
    if (!el || !open) return;

    el.addEventListener('keydown', handleKeyDown, true);
    return () => el.removeEventListener('keydown', handleKeyDown, true);
  }, [inputRef, open, handleKeyDown]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target) &&
          inputRef?.current && !inputRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, inputRef]);

  const selectReply = (reply) => {
    if (!reply) return;

    // Track usage
    api.post(`/quick-replies/${reply._id}/use`).catch(() => {});

    // Replace the "/shortcut" portion with the reply message
    onSelect(reply.message, reply._id);
    setOpen(false);
  };

  if (!open) return null;

  const positionClass = position === 'below'
    ? 'top-full mt-1'
    : 'bottom-full mb-1';

  return (
    <div
      ref={popupRef}
      className={`absolute left-0 right-0 ${positionClass} z-50 bg-white rounded-xl border border-surface-200 shadow-xl shadow-black/8 overflow-hidden animate-fade-in-up`}
      style={{ maxHeight: '320px' }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-surface-100 flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-brand-500" strokeWidth={2} />
        <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">Quick Replies</span>
        {query && (
          <span className="ml-auto text-[11px] text-surface-400 font-medium">
            /{query}
          </span>
        )}
      </div>

      {/* Results */}
      <div className="overflow-y-auto" style={{ maxHeight: '264px' }}>
        {loading && !results.length ? (
          <div className="flex items-center justify-center py-6 gap-2">
            <Loader2 className="w-4 h-4 text-surface-400 animate-spin" />
            <span className="text-[12px] text-surface-400">Searching...</span>
          </div>
        ) : results.length === 0 ? (
          <div className="py-6 text-center">
            <Search className="w-5 h-5 text-surface-300 mx-auto mb-1.5" />
            <p className="text-[12px] text-surface-400 font-medium">
              {query ? `No quick replies matching "/${query}"` : 'No quick replies yet'}
            </p>
            <p className="text-[11px] text-surface-300 mt-0.5">Create quick replies in Settings → Quick Replies</p>
          </div>
        ) : (
          results.map((reply, index) => (
            <button
              key={reply._id}
              type="button"
              className={`w-full text-left px-3 py-2.5 flex items-start gap-3 transition-all border-b border-surface-50 last:border-0 ${
                index === activeIndex
                  ? 'bg-brand-50/60'
                  : 'hover:bg-surface-50'
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectReply(reply)}
            >
              {/* Icon */}
              <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                index === activeIndex ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-500'
              }`}>
                <MessageSquare className="w-3.5 h-3.5" strokeWidth={2} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-surface-900 truncate">
                    {reply.title}
                  </span>
                  {reply.shortcut && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-md flex-shrink-0">
                      <Hash className="w-2.5 h-2.5" />
                      {reply.shortcut}
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                    CATEGORY_COLORS[reply.category] || CATEGORY_COLORS.general
                  }`}>
                    {reply.category}
                  </span>
                </div>
                <p className="text-[12px] text-surface-500 mt-0.5 line-clamp-2 leading-relaxed">
                  {reply.message}
                </p>
              </div>

              {/* Arrow */}
              {index === activeIndex && (
                <ChevronRight className="w-4 h-4 text-brand-400 mt-1 flex-shrink-0" />
              )}
            </button>
          ))
        )}
      </div>

      {/* Footer hint */}
      {results.length > 0 && (
        <div className="px-3 py-1.5 border-t border-surface-100 bg-surface-50/50 flex items-center gap-3">
          <span className="text-[10px] text-surface-400">
            <kbd className="px-1 py-0.5 bg-white border border-surface-200 rounded text-[9px] font-mono">↑↓</kbd> navigate
          </span>
          <span className="text-[10px] text-surface-400">
            <kbd className="px-1 py-0.5 bg-white border border-surface-200 rounded text-[9px] font-mono">Enter</kbd> select
          </span>
          <span className="text-[10px] text-surface-400">
            <kbd className="px-1 py-0.5 bg-white border border-surface-200 rounded text-[9px] font-mono">Esc</kbd> close
          </span>
        </div>
      )}
    </div>
  );
}
