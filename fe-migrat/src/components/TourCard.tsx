type Tour = {
  title: string;
  image?: string | null;
  altText?: string | null;
  location: string;
  recurringSchedule?: string | null;
  sourceUrl?: string | null;
  externalPageUrl?: string | null;
};

const getSourceLabel = (sourceUrl?: string) => {
  if (!sourceUrl) return '';
  try { return new URL(sourceUrl).hostname.replace(/^www\./, ''); } catch { return ''; }
};

export default function TourCard({ tour, highlight }: { tour: Tour; highlight?: string }) {
  const sourceLabel = getSourceLabel(tour.sourceUrl ?? undefined);
  const savedKey = 'saved_tours_v1'
  const isSaved = (() => {
    try {
      const raw = localStorage.getItem(savedKey)
      if (!raw) return false
      const arr = JSON.parse(raw) as string[]
      return arr.includes(tour.externalPageUrl || tour.sourceUrl || tour.title)
    } catch { return false }
  })()

  const toggleSave = () => {
    try {
      const raw = localStorage.getItem(savedKey)
      const arr = raw ? (JSON.parse(raw) as string[]) : []
      const key = tour.externalPageUrl || tour.sourceUrl || tour.title
      const next = arr.includes(key) ? arr.filter((s) => s !== key) : [key, ...arr]
      localStorage.setItem(savedKey, JSON.stringify(next))
      // trigger a small visual update by reloading location (cheap)
      window.dispatchEvent(new CustomEvent('wakapadi:savedTours:changed'))
    } catch (e) { console.warn('save failed', e) }
  }

  const share = async () => {
    const url = tour.externalPageUrl || tour.sourceUrl || window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: tour.title, text: `${tour.title} — ${tour.location}`, url })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        alert('Link copied to clipboard')
      } else {
        window.open(url, '_blank')
      }
    } catch (err) {
      console.warn('share failed', err)
    }
  }
  return (
    <article className="h-full p-2">
      <div className="flex flex-col h-full rounded-lg overflow-hidden bg-white border shadow-sm hover:shadow-md transition">
        {tour.image ? (
          <div className="w-full h-44 relative bg-gray-100">
            <img src={tour.image} alt={tour.altText || tour.title} className="object-cover w-full h-full" />
            <div className="absolute left-2 right-2 bottom-2 flex gap-2">
              {sourceLabel && <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-full">{sourceLabel}</span>}
            </div>
          </div>
        ) : (
          <div className="w-full h-44 flex items-center justify-center bg-gray-50">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-gray-300" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        )}

        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-sm font-semibold text-gray-900">{highlight ? <span dangerouslySetInnerHTML={{ __html: tour.title.replace(new RegExp(highlight, 'ig'), (m) => `<mark class='bg-yellow-100 rounded'>${m}</mark>`) }} /> : tour.title}</h3>
          <div className="mt-2 text-xs text-gray-500">{tour.location}</div>
          <div className="mt-4 mt-auto flex items-center justify-between gap-2">
            <div className="text-xs text-gray-500">{tour.recurringSchedule || 'Recurring'}</div>
            <div className="flex items-center gap-2">
              <button onClick={toggleSave} className={`text-xs px-2 py-1 rounded ${isSaved ? 'bg-yellow-100 border' : 'border bg-white'}`}>
                {isSaved ? 'Saved' : 'Save'}
              </button>
              <button onClick={share} className="text-xs px-2 py-1 border rounded">Share</button>
              {tour.externalPageUrl && (
                <a href={tour.externalPageUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600">Open</a>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
