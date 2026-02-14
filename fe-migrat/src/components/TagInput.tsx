import React, { useEffect, useRef, useState } from 'react'

type Props = {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  suggestions?: string[]
}

export default function TagInput({ value, onChange, placeholder, suggestions = [] }: Props) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (input.length > 0) setOpen(true)
    else setOpen(false)
  }, [input])

  const add = (raw?: string) => {
    const v = ((raw ?? input) || '').trim()
    if (!v) return
    if (value.includes(v)) {
      setInput('')
      return
    }
    onChange([...value, v])
    setInput('')
    setOpen(false)
    ref.current?.focus()
  }

  const remove = (t: string) => onChange(value.filter((x) => x !== t))

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add()
    } else if (e.key === 'Backspace' && input === '') {
      // remove last
      if (value.length > 0) onChange(value.slice(0, -1))
    }
  }

  const filteredSuggestions = suggestions.filter((s) => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)).slice(0, 6)

  return (
    <div>
      <div className="flex gap-2">
        <input
          ref={ref}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => add(), 150)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border rounded bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
        />
        <button
          type="button"
          onClick={() => add()}
          aria-label="Add tag"
          className="px-3 py-2 bg-gray-100 border rounded text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
        >
          Add
        </button>
      </div>

      {open && filteredSuggestions.length > 0 && (
        <div className="mt-1 border bg-white rounded shadow-sm max-h-40 overflow-auto z-10 dark:bg-gray-800 dark:border-gray-700">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(s)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-2 px-2 py-1 bg-gray-100 text-gray-900 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
          >
            <span className="truncate max-w-xs">{t}</span>
            <button
              onClick={() => remove(t)}
              aria-label={`Remove ${t}`}
              className="text-xs text-red-600 hover:text-red-700 ml-1"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
