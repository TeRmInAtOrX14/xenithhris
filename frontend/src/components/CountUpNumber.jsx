import React, { useEffect, useState } from 'react';

export default function CountUpNumber({ end = 0, duration = 400, prefix = '', suffix = '', decimals = 0 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const endVal = Number(end) || 0;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out quad
      const easedProgress = 1 - Math.pow(1 - progress, 2);
      setCount(easedProgress * endVal);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [end, duration]);

  const formatted = decimals > 0 ? count.toFixed(decimals) : Math.round(count).toLocaleString();

  return (
    <span>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
