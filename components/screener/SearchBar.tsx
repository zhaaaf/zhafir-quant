"use client";
import { useState, useRef, useEffect } from "react";
import { Search, Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import type { StockSearchResult } from "@/lib/types";

interface Props {
  onAdd: (ticker: string) => void;
  added: string[];
}

export default function SearchBar({ onAdd, added }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.screener.search(query);
        setResults(data.results);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  return (
    <div className="relative w-full max-w-lg">
      <div className="flex items-center gap-2 bg-[#11111b] border border-[#2a2a3e] rounded-lg px-3 py-2 focus-within:border-[#7aa2f7]/60 transition-colors">
        {loading ? <Loader2 size={14} className="text-[#6c7086] animate-spin shrink-0" />
                 : <Search size={14} className="text-[#6c7086] shrink-0" />}
        <input
          className="flex-1 bg-transparent text-[#cdd6f4] text-sm placeholder:text-[#45475a] outline-none"
          placeholder="Search ticker or company (BBCA, AAPL, Nvidia…)"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-[#11111b] border border-[#2a2a3e] rounded-lg shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto">
          {results.map(r => (
            <button
              key={r.symbol}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#1a1a2e] transition-colors group text-left"
              onMouseDown={() => { onAdd(r.symbol); setQuery(""); setOpen(false); }}
            >
              <div>
                <span className="text-[#7aa2f7] font-mono text-sm font-semibold">{r.symbol}</span>
                <span className="text-[#6c7086] text-xs ml-2">{r.exchange}</span>
                <div className="text-[#a6adc8] text-xs truncate max-w-xs">{r.name}</div>
              </div>
              {added.includes(r.symbol)
                ? <span className="text-[#9ece6a] text-xs font-mono">added</span>
                : <Plus size={13} className="text-[#6c7086] group-hover:text-[#7aa2f7]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
