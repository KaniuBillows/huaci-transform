import { useEffect, useRef, useState } from 'react';

/**
 * 将增量文本按设置逐字或立即展示。
 */
export function useDisplayedText(source: string, typewriter: boolean): string {
  const [shown, setShown] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setShown(typewriter ? '' : source);
  }, [typewriter]);

  useEffect(() => {
    if (!typewriter) {
      setShown(source);
      indexRef.current = source.length;
      return;
    }
    if (indexRef.current >= source.length) {
      return;
    }
    const timer = window.setInterval(() => {
      indexRef.current = Math.min(indexRef.current + 2, source.length);
      setShown(source.slice(0, indexRef.current));
      if (indexRef.current >= source.length) {
        window.clearInterval(timer);
      }
    }, 16);
    return () => window.clearInterval(timer);
  }, [source, typewriter]);

  return shown;
}
