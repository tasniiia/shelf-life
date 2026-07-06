import { useMemo } from 'react';
import CurrentlyReadingCard from './CurrentlyReadingCard';
import { sortByDateAddedDescending } from '../../lib/currentlyReading';

export default function CurrentlyReadingHero({ library }) {
  const books = useMemo(
    () => sortByDateAddedDescending(library.currentlyReading || []),
    [library.currentlyReading]
  );

  if (books.length === 0) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-10 sm:pt-14">
      <p className="ledger-label mb-2">Currently Reading</p>
      <h2 className="font-display text-2xl font-semibold tracking-tight mb-5">
        Pick up where you left off.
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {books.map((book) => (
          <CurrentlyReadingCard key={book.isbn || book.title} book={book} />
        ))}
      </div>
    </div>
  );
}
