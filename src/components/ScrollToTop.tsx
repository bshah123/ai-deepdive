import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  const { pathname } = useLocation();
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    // Only scroll to top when the user actually navigates to a different page/route
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;

      const scrollContainer = document.getElementById('main-scroll-area');
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
};
