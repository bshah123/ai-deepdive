import React, { useEffect, useState } from 'react';

export const ReadingProgressBar: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const scrollContainer = document.getElementById('main-scroll-area');

    const handleScroll = () => {
      if (scrollContainer) {
        const totalHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        if (totalHeight > 0) {
          const currentProgress = (scrollContainer.scrollTop / totalHeight) * 100;
          setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
        }
      } else {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (totalHeight > 0) {
          const currentProgress = (window.scrollY / totalHeight) * 100;
          setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
        }
      }
    };

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-slate-200/20 dark:bg-slate-800/20 backdrop-blur-sm pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 transition-all duration-150 ease-out shadow-[0_0_12px_rgba(99,102,241,0.8)]"
        style={{ width: `${scrollProgress}%` }}
      />
    </div>
  );
};
