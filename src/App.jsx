import { useEffect } from 'react';
import AppRoutes from './components/Route/Route';

const App = () => {
  useEffect(() => {
    // Synchronize background scroll lock whenever any modal/pop-up form is mounted or removed
    const syncModalScrollLock = () => {
      const modalOverlays = document.querySelectorAll(
        '.fixed.inset-0.z-50, .fixed.inset-0[class*="z-50"], .fixed.inset-0[class*="z-["]'
      );

      let isModalOpen = false;
      for (let i = 0; i < modalOverlays.length; i++) {
        const el = modalOverlays[i];
        if (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0) {
          isModalOpen = true;
          break;
        }
      }

      if (isModalOpen) {
        if (!document.body.classList.contains('modal-scroll-lock')) {
          document.body.classList.add('modal-scroll-lock');
          document.documentElement.classList.add('modal-scroll-lock');
        }
      } else {
        if (document.body.classList.contains('modal-scroll-lock')) {
          document.body.classList.remove('modal-scroll-lock');
          document.documentElement.classList.remove('modal-scroll-lock');
        }
      }
    };

    // Observe DOM mutations to immediately detect any pop-up open/close state change
    const observer = new MutationObserver(() => {
      syncModalScrollLock();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    // Prevent background page pull/bounce on mobile touch devices when touching the backdrop
    const handleTouchMove = (e) => {
      if (!document.body.classList.contains('modal-scroll-lock')) return;
      const target = e.target;
      const scrollable = target.closest(
        '.overflow-y-auto, .overflow-auto, form, [data-scrollable]'
      );
      if (!scrollable && e.cancelable) {
        e.preventDefault();
      }
    };

    // All valid form submissions return the page to its top-level context.
    const handleFormSubmit = (event) => {
      if (!(event.target instanceof HTMLFormElement)) return;
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    };

    // Prevent mouse wheel on the backdrop from bleeding into the background
    const handleWheel = (e) => {
      if (!document.body.classList.contains('modal-scroll-lock')) return;
      const scrollable = e.target.closest(
        '.overflow-y-auto, .overflow-auto, form, [data-scrollable]'
      );
      if (!scrollable && e.cancelable) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('submit', handleFormSubmit, true);

    // Initial check
    syncModalScrollLock();

    return () => {
      observer.disconnect();
      window.removeEventListener('wheel', handleWheel);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('submit', handleFormSubmit, true);
      document.body.classList.remove('modal-scroll-lock');
      document.documentElement.classList.remove('modal-scroll-lock');
    };
  }, []);

  return <AppRoutes />;
};

export default App;
