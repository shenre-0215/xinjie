"use client";

type Props = {
  onBack: () => void;
};

export function ReviewScreen({ onBack }: Props) {
  return (
    <section className="xuan-primer-card">
      <button className="xuan-back-btn" onClick={onBack}>
        ← 返回
      </button>

      <h1 className="xuan-primer-title">回访</h1>

      <div className="xuan-primer-copy">
        <p>这里以后会放需要重新打开的悬置。</p>
        <p>不是立刻给答案，而是在合适的时候给一个暂定结论。</p>
      </div>

      <div className="xuan-empty-panel">
        <span>COMING LATER</span>
        <p>当副本被悬置一段时间后，它会出现在这里。</p>
      </div>
    </section>
  );
}
