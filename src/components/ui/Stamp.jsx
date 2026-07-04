import clsx from 'clsx';

/**
 * The due-date-stamp motif used throughout the app: for match scores,
 * slide numbers, and verdicts. Rotated slightly and inked in `stamp` red
 * (or `ledger` green for positive/neutral readings) to look hand-stamped.
 */
export default function Stamp({ children, tone = 'stamp', size = 'md', className }) {
  const toneClass = tone === 'ledger' ? 'border-ledger text-ledger' : 'border-stamp text-stamp';
  const sizeClass = size === 'lg' ? 'text-base px-4 py-2' : 'text-xs px-2.5 py-1';
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full border-2 font-mono uppercase tracking-widest -rotate-2.5 select-none',
        toneClass,
        sizeClass,
        className
      )}
      style={{ mixBlendMode: 'multiply' }}
    >
      {children}
    </span>
  );
}
