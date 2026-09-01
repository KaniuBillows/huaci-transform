import { useEffect, useRef, useState } from 'react';

/**
 * 将增量文本按设置逐字或立即展示。
 * 当 source 被清空或缩短（新一次请求）时，重置打字机进度。
 */
export function useDisplayedText(source: string, typewriter: boolean): string {
  const [shown, setShown] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    if (!typewriter) {
      setShown(source);
      indexRef.current = source.length;
      return;
    }

    // 新请求清空/缩短内容时，必须回退进度，否则会一直卡在旧文案
    if (source.length < indexRef.current) {
      indexRef.current = 0;
      setShown('');
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
