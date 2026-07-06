import { useCallback, useRef, useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { parseGoodreadsCsv } from '../../lib/csv';
import Card from '../ui/Card';
import Button from '../ui/Button';

export default function CsvUpload({ onLibraryParsed }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      setError(null);
      setIsLoading(true);
      try {
        const text = await file.text();
        const library = parseGoodreadsCsv(text);
        if (!library.all.length) {
          throw new Error('That CSV parsed but had no rows we could read. Is it a Goodreads export?');
        }
        onLibraryParsed(library);
      } catch (e) {
        setError(e.message || 'Could not read that file.');
      } finally {
        setIsLoading(false);
      }
    },
    [onLibraryParsed]
  );

  return (
    <div className="max-w-xl mx-auto px-4 py-16 sm:py-24">
      <p className="ledger-label mb-3">Step 1 of 2</p>
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
        Check in your shelf.
      </h1>
      <p className="text-ink/70 mb-8 leading-relaxed">
        Export your library from Goodreads (Account Settings → Import/Export →
        Export Library) and drop the CSV below. Everything is parsed right
        here in your browser — nothing is uploaded to a server.
      </p>

      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? 'border-stamp bg-stamp/5' : 'border-line'
        } py-12 text-center cursor-pointer`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {isLoading ? (
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-stamp" />
        ) : (
          <UploadCloud className="w-8 h-8 mx-auto mb-3 text-ink/40" />
        )}
        <p className="font-medium mb-1">
          {isLoading ? 'Reading your shelf…' : 'Drop your goodreads_library_export.csv here'}
        </p>
        <p className="text-sm text-ink/50 mb-4">or click to browse</p>
        <Button variant="secondary" size="sm" type="button">
          Choose file
        </Button>
      </Card>

      {error && (
        <p className="mt-4 text-sm text-stamp" role="alert">
          {error}
        </p>
      )}

      <p className="mt-6 text-xs text-ink/40 leading-relaxed">
        Don't have Goodreads data handy? You can also{' '}
        <a
          href="https://www.goodreads.com/review/import"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          export it from Goodreads
        </a>{' '}
        first — it only takes a minute.
      </p>
    </div>
  );
}
