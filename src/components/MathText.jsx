import React, { useEffect, useRef } from 'react';
import katex from 'katex';

export default function MathText({ text }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !text) return;
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$.*?\$)/g);
    containerRef.current.innerHTML = '';

    parts.forEach(part => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const span = document.createElement('span');
        katex.render(part.slice(2, -2), span, { displayMode: true, throwOnError: false });
        containerRef.current.appendChild(span);
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const span = document.createElement('span');
        katex.render(part.slice(1, -1), span, { displayMode: false, throwOnError: false });
        containerRef.current.appendChild(span);
      } else {
        containerRef.current.appendChild(document.createTextNode(part));
      }
    });
  }, [text]);

  return <span ref={containerRef} />;
}