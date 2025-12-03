import { useEffect } from 'react';

/**
 * Adds the `is-visible` class to elements as they enter the viewport.
 * Targets elements with the provided selector (defaults to `[data-animate]`).
 */
export function useScrollReveal(selector: string = '[data-animate]'): void {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(selector)
    );

    if (!elements.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    elements.forEach((element) => {
      if (!element.classList.contains('is-visible')) {
        element.classList.add('is-reveal-ready');
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [selector]);
}
