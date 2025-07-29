/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { useViewportStore } from '@/stores/viewport.store';

// listeners must be instatiate only once
export const useMobileListener = () => {
  const { setIsMobile } = useViewportStore();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);
};
