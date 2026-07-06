import { useState } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';

export default function CustomizeSummaryModal({ open, onClose, availableSlides, initialSelection, onSave }) {
  const [selected, setSelected] = useState(initialSelection || []);

  if (!open) return null;

  function toggle(id) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev; // cap at 3 — further clicks are simply ignored, not an error
      return [...prev, id];
    });
  }

  function handleSave() {
    onSave(selected);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40" onClick={onClose}>
      <div
        className="catalog-card w-full max-w-sm p-6 relative max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-ink/40 hover:text-ink" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
        <p className="ledger-label mb-2">Customize Summary</p>
        <h2 className="font-display text-xl font-semibold mb-2">Pick up to 3 cards</h2>
        <p className="text-sm text-ink/60 mb-4">
          Choose exactly which insights show up in your shareable summary. Leave none checked to keep the
          automatic pick.
        </p>
        <div className="space-y-2 mb-5 overflow-y-auto">
          {availableSlides.map((slide) => {
            const checked = selected.includes(slide.id);
            return (
              <label
                key={slide.id}
                className="flex items-center gap-3 border border-line rounded-sm p-3 cursor-pointer hover:bg-paper"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(slide.id)}
                  disabled={!checked && selected.length >= 3}
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs text-ink/50">{slide.eyebrow}</p>
                  <p className="text-sm font-medium truncate">{slide.headline}</p>
                </div>
              </label>
            );
          })}
        </div>
        <Button onClick={handleSave} className="w-full">
          Save Selection
        </Button>
      </div>
    </div>
  );
}
