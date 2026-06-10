"use client";

import { useState } from "react";
import { emitParticleBurst } from "./ParticleCanvas";
import { XinjieGlyph } from "./XinjieGlyph";

type Props = {
  onStart: () => void;
};

export function LandingScreen({ onStart }: Props) {
  const [pressed, setPressed] = useState(false);

  const burst = () => {
    setPressed(true);
    emitParticleBurst();
    window.setTimeout(() => setPressed(false), 200);
  };

  const start = () => {
    burst();
    window.setTimeout(onStart, 420);
  };

  return (
    <>
      <div className="xuan-gate" aria-hidden="true">
        <svg className="xuan-gate-star-map" viewBox="0 0 680 540">
          <path d="M 74 92 L 582 64 L 615 392 L 126 454 L 74 92" />
          <path d="M 74 92 L 312 166 L 582 64" />
          <path d="M 126 454 L 368 356 L 615 392" />
          <path d="M 312 166 L 368 356" />
          <circle className="is-node-a" cx="74" cy="92" r="3.2" />
          <circle className="is-node-b" cx="582" cy="64" r="2.7" />
          <circle className="is-node-c" cx="615" cy="392" r="3.4" />
          <circle className="is-node-d" cx="126" cy="454" r="2.9" />
          <circle className="is-node-e" cx="312" cy="166" r="2.3" />
          <circle className="is-node-f" cx="368" cy="356" r="2.4" />
        </svg>
        <span className="xuan-gate-corner xuan-gate-corner-tl" />
        <span className="xuan-gate-corner xuan-gate-corner-tr" />
        <span className="xuan-gate-corner xuan-gate-corner-bl" />
        <span className="xuan-gate-corner xuan-gate-corner-br" />
      </div>

      <div className="xuan-glyph-stage">
        <XinjieGlyph pressed={pressed} onClick={burst} />
      </div>

      <div className="xuan-instance-code">XINJIE / INNER MAP</div>

      <div className="xuan-subtitle" aria-live="polite">
        <span className="xuan-subtitle-part xuan-subtitle-one">不急着解</span>
        <span className="xuan-subtitle-part xuan-subtitle-two">，</span>
        <span className="xuan-subtitle-part xuan-subtitle-three">先用心看</span>
      </div>

      <button className="xuan-start-btn" onClick={start} aria-label="进入心门">
        开始
      </button>
    </>
  );
}
