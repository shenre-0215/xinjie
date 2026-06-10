"use client";

import { useState } from "react";

type Props = {
  onClick?: () => void;
  pressed?: boolean;
};

export function XinjieGlyph({ onClick, pressed }: Props) {
  const [hover, setHover] = useState(false);

  return (
    <svg
      className={`xinjie-glyph${hover ? " is-hover" : ""}${pressed ? " is-pressed" : ""}`}
      viewBox="0 0 400 400"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label="心解标志"
    >
      <defs>
        <filter id="glyph-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g className="xinjie-grid">
        {Array.from({ length: 9 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="80"
            y1={100 + i * 25}
            x2="320"
            y2={100 + i * 25}
            className="xinjie-grid-line"
          />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={80 + i * 26.67}
            y1="100"
            x2={80 + i * 26.67}
            y2="300"
            className="xinjie-grid-line"
          />
        ))}
      </g>

      <g className="xinjie-heart-outer">
        <path
          d="M 200 110
             C 160 80 100 100 100 145
             C 100 195 200 280 200 280
             C 200 280 300 195 300 145
             C 300 100 240 80 200 110 Z"
          className="xinjie-heart-path"
        />
      </g>

      <g className="xinjie-heart-inner">
        <path
          d="M 200 128
             C 176 108 132 122 132 152
             C 132 186 200 256 200 256
             C 200 256 268 186 268 152
             C 268 122 224 108 200 128 Z"
          className="xinjie-heart-path"
        />
      </g>

      <g className="xinjie-wordmark" aria-hidden="true">
        <text x="129" y="219" className="xinjie-word xinjie-word-xin">心</text>
        <text x="205" y="219" className="xinjie-word xinjie-word-jie">解</text>
      </g>

      <g className="xinjie-cut-lines" aria-hidden="true">
        <path d="M 198 142 L 198 258" className="xinjie-cut xinjie-cut-main" />
        <path d="M 118 232 L 285 232" className="xinjie-cut xinjie-cut-base" />
        <path d="M 226 154 L 279 154 L 279 207" className="xinjie-cut xinjie-cut-jie" />
        <path d="M 236 184 L 276 184" className="xinjie-cut xinjie-cut-jie" />
      </g>

      <g className="xinjie-echo" aria-hidden="true">
        <path d="M 148 290 Q 200 306 252 290" className="xinjie-echo-line xinjie-echo-main" />
        <path d="M 166 306 Q 200 316 234 306" className="xinjie-echo-line xinjie-echo-soft" />
      </g>
    </svg>
  );
}
