import { useEffect, useRef, useState } from "react";
import { inputClass } from "./formStyles";

export interface UserPickerOption {
  id: string;
  email: string;
  fullName: string;
}

interface Props {
  users: UserPickerOption[];
  value: string | null;
  onChange: (userId: string | null) => void;
  placeholder?: string;
}

// Lightweight searchable combobox — a plain <select> can't be styled to
// match the glass dark theme, and a full select library is overkill for
// picking a user out of a list. Type to filter by name or email; the
// "Unassigned" option is always pinned to the top.
export function UserPicker({ users, value, onChange, placeholder = "Search users…" }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = users.find((u) => u.id === value) ?? null;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return u.email.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q);
  });

  return (
    <div className="relative" ref={containerRef}>
      <input
        className={inputClass}
        placeholder={placeholder}
        value={open ? query : selected ? `${selected.fullName} <${selected.email}>` : ""}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => setQuery(e.target.value)}
      />

      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-800/80 bg-base-surface shadow-xl">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-gray-400 transition hover:bg-white/5"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            Unassigned
          </button>
          {filtered.map((u) => (
            <button
              key={u.id}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-gray-200 transition hover:bg-white/5"
              onClick={() => {
                onChange(u.id);
                setOpen(false);
              }}
            >
              <span className="font-medium">{u.fullName}</span> <span className="text-gray-500">&lt;{u.email}&gt;</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="px-3 py-2 text-sm text-gray-600">No matching users.</p>}
        </div>
      )}
    </div>
  );
}
