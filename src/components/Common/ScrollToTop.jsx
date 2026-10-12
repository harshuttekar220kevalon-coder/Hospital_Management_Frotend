import React, { useState, useEffect } from 'react';

const ScrollToTop = ({ currentPage }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Automatically scroll to top whenever the page/route changes
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }, [currentPage]);

  // Track scroll position to show/hide button and calculate scroll percentage
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      
      if (scrollHeight > 0) {
        const progress = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
        setScrollProgress(progress);
      }

      if (scrollTop > 250) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) return null;

  // SVG circle circumference for 44px diameter circle (radius = 18)
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in group">
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        title="Scroll to top"
        className="relative flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xl shadow-teal-500/20 hover:shadow-teal-500/35 border border-slate-200/80 dark:border-slate-700/80 hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/50"
      >
        {/* Circular Progress Ring */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
          viewBox="0 0 44 44"
        >
          {/* Background Track */}
          <circle
            cx="22"
            cy="22"
            r={radius}
            className="text-slate-100 dark:text-slate-800"
            strokeWidth="2.5"
            stroke="currentColor"
            fill="transparent"
          />
          {/* Active Progress Fill */}
          <circle
            cx="22"
            cy="22"
            r={radius}
            className="text-teal-600 dark:text-teal-400 transition-all duration-150 ease-out"
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
          />
        </svg>

        {/* Arrow Up Icon with bounce on hover */}
        <svg
          className="w-5 h-5 transition-transform duration-300 group-hover:-translate-y-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>

        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold tracking-wide whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-md">
          Scroll to Top ({Math.round(scrollProgress)}%)
        </span>
      </button>
    </div>
  );
};

export default ScrollToTop;
