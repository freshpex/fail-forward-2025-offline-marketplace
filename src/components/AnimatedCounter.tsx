import { useEffect, useMemo, useRef, useState } from 'react';

type Formatter = (value: number) => string;

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  formatter?: Formatter;
  className?: string;
}

/**
 * Smoothly animates numeric content once it scrolls into view.
 * Falls back to locale formatting, but allows custom formatters for strings like `200M+`.
 */
export function AnimatedCounter({
  value,
  duration = 1600,
  prefix = '',
  suffix = '',
  decimals = 0,
  formatter,
  className = '',
}: AnimatedCounterProps) {
  const nodeRef = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState('0');
  const formatValue = useMemo<Formatter>(() => {
    if (formatter) {
      return formatter;
    }

    return (val: number) => {
      return val.toLocaleString('en-NG', {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      });
    };
  }, [decimals, formatter]);

  useEffect(() => {
    setDisplay(`${prefix}${formatValue(0)}${suffix}`);
  }, [formatValue, prefix, suffix]);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || typeof window === 'undefined') {
      return undefined;
    }

  let animationFrame: number | null = null;
    let startTimestamp: number | null = null;

    const runAnimation = (timestamp: number) => {
      if (startTimestamp === null) {
        startTimestamp = timestamp;
      }

      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const currentValue = value * progress;
      setDisplay(`${prefix}${formatValue(currentValue)}${suffix}`);

      if (progress < 1) {
  animationFrame = window.requestAnimationFrame(runAnimation);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            observer.disconnect();
            animationFrame = window.requestAnimationFrame(runAnimation);
          }
        });
      },
      {
        threshold: 0.5,
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [duration, formatValue, prefix, suffix, value]);

  return (
    <span ref={nodeRef} className={`animated-counter ${className}`.trim()}>
      {display}
    </span>
  );
}
