import React from 'react';

/**
 * ActiveFilterTags
 * Renders active filter chips above tables with individual remove buttons and a Clear All button.
 */
const ActiveFilterTags = ({ filters = [], onClearAll, className = '' }) => {
  const activeFilters = filters.filter(
    (f) =>
      f &&
      f.value !== undefined &&
      f.value !== null &&
      f.value !== '' &&
      f.value !== 'ALL' &&
      f.value !== 'all'
  );

  if (activeFilters.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl bg-teal-50/80 border border-teal-200/90 shadow-2xs ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1.5 shrink-0">
          <svg className="w-3.5 h-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Active Filters:
        </span>

        {activeFilters.map((filter, idx) => (
          <span
            key={`${filter.name}-${idx}`}
            onClick={filter.onRemove}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white text-teal-950 border border-teal-300 text-xs font-semibold shadow-2xs hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition cursor-pointer group"
            title={`Click to remove ${filter.name} filter`}
          >
            <span className="text-slate-500 font-medium group-hover:text-rose-600">{filter.name}:</span>
            <span className="font-bold">{filter.displayValue || filter.value}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                filter.onRemove();
              }}
              className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 group-hover:text-rose-600 hover:bg-rose-100 transition"
              aria-label={`Remove ${filter.name} filter`}
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>

      {onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition shadow-2xs cursor-pointer ml-auto"
        >
          <svg className="w-3 h-3 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Clear</span>
        </button>
      )}
    </div>
  );
};

export default ActiveFilterTags;
