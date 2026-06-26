"use client";
import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import type { ParamHelp } from "@/lib/paramHelp";

interface Props {
  help: ParamHelp;
  onSuggest?: (value: string | number) => void;
}

export default function ParamHelpButton({ help, onSuggest }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="text-[#45475a] hover:text-[#7aa2f7] transition-colors ml-1 align-middle"
        title={help.short}
      >
        <HelpCircle size={12} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Popover */}
          <div className="absolute left-0 top-6 z-50 w-72 bg-[#1a1a2e] border border-[#3d59a1]/40 rounded-xl shadow-2xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-[#7aa2f7] font-semibold text-xs">{help.label}</span>
              <button onClick={() => setOpen(false)} className="text-[#45475a] hover:text-[#cdd6f4]">
                <X size={11} />
              </button>
            </div>

            <p className="text-[#a6adc8] text-xs leading-relaxed">{help.detail}</p>

            {/* Suggestions */}
            {help.suggestions.length > 0 && (
              <div>
                <div className="text-[#6c7086] text-[10px] font-mono uppercase tracking-wider mb-1.5">
                  Nilai yang sering dipakai:
                </div>
                <div className="space-y-1">
                  {help.suggestions.map(s => (
                    <button
                      key={s.label}
                      onClick={() => { onSuggest?.(s.value); setOpen(false); }}
                      className={[
                        "w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors border",
                        onSuggest
                          ? "border-[#2a2a3e] hover:border-[#7aa2f7]/40 hover:bg-[#1e2035] cursor-pointer"
                          : "border-[#1e1e2e] cursor-default",
                      ].join(" ")}
                    >
                      <span className="text-[#cdd6f4] font-mono">{s.label}</span>
                      <span className="text-[#45475a] ml-1.5">— {s.note}</span>
                    </button>
                  ))}
                </div>
                {onSuggest && (
                  <div className="text-[#45475a] text-[10px] mt-1.5">↑ klik untuk auto-isi</div>
                )}
              </div>
            )}

            {help.learnMore && (
              <a
                href={`https://doi.org/${help.learnMore}`}
                target="_blank" rel="noopener noreferrer"
                className="text-[#45475a] hover:text-[#7aa2f7] text-[10px] font-mono block transition-colors"
              >
                DOI: {help.learnMore} ↗
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
