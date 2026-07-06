import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { searchBooksForAutocomplete } from '../../lib/vocabulary';

export default function BookAutocomplete({ library, value, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const results = searchBooksForAutocomplete(library, query);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(book) {
    onChange(book);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium mb-1.5" htmlFor="vocab-source-book">
        From which book? <span className="text-ink/40 font-normal">(optional)</span>
      </label>

      {value && !open ? (
        <div className="flex items-center justify-between border border-line rounded-sm px-3 py-2.5 bg-card">
          <div className="min-w-0">
            <p className="text-sm truncate">{value.title}</p>
            {value.author && <p className="text-xs text-ink/50 truncate">{value.author}</p>}
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 text-ink/40 hover:text-ink ml-2"
            aria-label="Clear selected book"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
          <input
            id="vocab-source-book"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Search title or author..."
            className="w-full border border-line rounded-sm pl-9 pr-3 py-2.5 text-sm bg-card"
          />
        </div>
      )}

      {open && !value && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto border border-line rounded-sm bg-card shadow-lg">
          {results.map((book) => (
            <button
              key={book.isTrackedOption ? 'not-tracked' : book.isbn || book.title}
              type="button"
              onClick={() => handleSelect(book)}
              className="w-full text-left px-3 py-2 hover:bg-paper transition-colors border-b border-line last:border-b-0"
            >
              <p className={`text-sm ${book.isTrackedOption ? 'text-ink/50 italic' : ''}`}>{book.title}</p>
              {book.author && <p className="text-xs text-ink/50">{book.author}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
