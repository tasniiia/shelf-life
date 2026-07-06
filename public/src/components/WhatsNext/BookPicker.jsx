export default function BookPicker({ books, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" htmlFor="finished-book">
        I just finished…
      </label>
      <select
        id="finished-book"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-card"
      >
        <option value="" disabled>
          Choose a book you've read
        </option>
        {books.map((b, i) => (
          <option key={`${b.title}-${i}`} value={i}>
            {b.title} — {b.author}
          </option>
        ))}
      </select>
    </div>
  );
}
