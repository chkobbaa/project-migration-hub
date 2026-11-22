import { useEffect, type RefObject } from 'react';

/**
 * Rubber-band overscroll: when the page is already at its top or bottom edge and the
 * user keeps pulling (touch) or flicking a trackpad, the content follows with
 * resistance and springs back. Skipped on Apple browsers, which already do this natively.
 */
export function useElasticScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ua = navigator.userAgent;
    const apple = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    if (apple || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = document.documentElement;
    root.classList.add('elastic-scroll');
    const MAX = 110;
    let startY = 0;
    let offset = 0;
    let wheelTimer = 0;
    const atTop = () => window.scrollY <= 0;
    const atBottom = () => window.innerHeight + window.scrollY >= root.scrollHeight - 1;
    const resist = (d: number) => Math.sign(d) * Math.min(MAX, Math.pow(Math.abs(d), 0.85) * 0.55);
    const apply = (y: number, spring: boolean) => {
      el.style.transition = spring ? 'transform .6s cubic-bezier(.2,1.45,.35,1)' : 'none';
      el.style.transform = y ? `translate3d(0, ${y}px, 0)` : '';
    };

    const onStart = (e: TouchEvent) => { startY = e.touches[0]?.clientY ?? 0; offset = 0; };
    const onMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0;
      const dy = y - startY;
      if ((dy > 0 && atTop()) || (dy < 0 && atBottom())) { offset = resist(dy); apply(offset, false); }
      else if (offset) { offset = 0; apply(0, false); startY = y; }
    };
    const onEnd = () => { if (offset) apply(0, true); offset = 0; };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      const pushingPastTop = e.deltaY < 0 && atTop();
      const pushingPastBottom = e.deltaY > 0 && atBottom();
      if (!pushingPastTop && !pushingPastBottom) return;
      offset = Math.max(-48, Math.min(48, offset - e.deltaY * 0.12));
      apply(offset, false);
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => { apply(0, true); offset = 0; }, 90);
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      root.classList.remove('elastic-scroll');
      window.clearTimeout(wheelTimer);
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      window.removeEventListener('wheel', onWheel);
      el.style.transform = '';
    };
  }, [ref]);
}
