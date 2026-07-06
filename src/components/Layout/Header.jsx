import clsx from 'clsx';
import { BookMarked } from 'lucide-react';

export default function Header({ view, onChangeView, hasLibrary }) {
  return (
    <header className="border-b border-line bg-paper/95 backdrop-blur sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BookMarked className="w-5 h-5 text-stamp" strokeWidth={2} />
          <span className="font-display text-xl font-semibold tracking-tight">ShelfLife</span>
        </div>

        {hasLibrary && (
          <nav className="hidden sm:flex items-center gap-1 bg-card border border-line rounded-full p-1">
            <TabButton active={view === 'vibe'} onClick={() => onChangeView('vibe')}>
              What's Next?
            </TabButton>
            <TabButton active={view === 'awareness'} onClick={() => onChangeView('awareness')}>
              Shelf Awareness
            </TabButton>
            <TabButton active={view === 'vocab'} onClick={() => onChangeView('vocab')}>
              Vocabulary Vault
            </TabButton>
          </nav>
        )}

        <div className="w-5" aria-hidden="true" />
      </div>

      {hasLibrary && (
        <nav className="sm:hidden flex border-t border-line">
          <TabButton full active={view === 'vibe'} onClick={() => onChangeView('vibe')}>
            What's Next?
          </TabButton>
          <TabButton full active={view === 'awareness'} onClick={() => onChangeView('awareness')}>
            Shelf Awareness
          </TabButton>
          <TabButton full active={view === 'vocab'} onClick={() => onChangeView('vocab')}>
            Vocabulary
          </TabButton>
        </nav>
      )}
    </header>
  );
}

function TabButton({ active, onClick, children, full }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'text-sm font-medium px-4 py-2 transition-colors',
        full ? 'flex-1 py-3' : 'rounded-full',
        active ? 'bg-ink text-paper' : 'text-ink/60 hover:text-ink'
      )}
    >
      {children}
    </button>
  );
}
