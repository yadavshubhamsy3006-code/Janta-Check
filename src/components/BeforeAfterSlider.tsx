import React, { useState } from 'react';
import { Columns2, SlidersHorizontal } from 'lucide-react';
import { ResilientImage } from './CivicBadges';

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Before (Citizen Report)',
  afterLabel = 'After (Officer Resolution)',
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50);
  const [mode, setMode] = useState<'slider' | 'side-by-side'>('slider');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#14213D]">
          Before &amp; After Verification Comparison
        </p>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode('slider')}
            className={`px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1 ${
              mode === 'slider' ? 'bg-white text-[#14213D] shadow-sm' : 'text-slate-600'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Slider</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('side-by-side')}
            className={`px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1 ${
              mode === 'side-by-side' ? 'bg-white text-[#14213D] shadow-sm' : 'text-slate-600'
            }`}
          >
            <Columns2 className="w-3 h-3" />
            <span>Side by Side</span>
          </button>
        </div>
      </div>

      {mode === 'slider' ? (
        <div className="space-y-2">
          <div className="relative aspect-[16/9] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 select-none">
            {/* After image (full width base) */}
            <ResilientImage
              src={afterUrl}
              alt={afterLabel}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Before image clipped cleanly using clip-path */}
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
            >
              <ResilientImage
                src={beforeUrl}
                alt={beforeLabel}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Vertical Divider Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow pointer-events-none"
              style={{ left: `${position}%` }}
            />

            {/* Corner Labels */}
            <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-[#14213D]/85 text-white text-[11px] font-medium">
              {beforeLabel}
            </span>
            <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-[#10B981]/90 text-white text-[11px] font-medium">
              {afterLabel}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-slate-600 shrink-0">Before</span>
            <input
              type="range"
              min={0}
              max={100}
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
              aria-label="Compare before and after resolution images"
              className="w-full accent-[#14213D] cursor-ew-resize"
            />
            <span className="text-[11px] font-medium text-[#10B981] shrink-0">After</span>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-slate-600">{beforeLabel}</p>
            <ResilientImage
              src={beforeUrl}
              alt={beforeLabel}
              className="w-full h-48 object-cover rounded-lg border border-slate-200"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-[#10B981]">{afterLabel}</p>
            <ResilientImage
              src={afterUrl}
              alt={afterLabel}
              className="w-full h-48 object-cover rounded-lg border border-emerald-200"
            />
          </div>
        </div>
      )}
    </div>
  );
}
