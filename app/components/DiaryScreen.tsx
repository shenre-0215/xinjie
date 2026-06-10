"use client";

import { useEffect, useState } from "react";
import { db, type Diary } from "../lib/db";
import { useConfirm } from "../lib/confirm";
import { useEscalation } from "../lib/critical-escalation";

type Props = {
  onBack: () => void;
  onSpawnFromDiary: (diary: Diary) => void;
  onDeleteDiary: (id: number) => void;
};

function formatDate(ms: number) {
  const d = new Date(ms);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function DiaryScreen({ onBack, onSpawnFromDiary, onDeleteDiary }: Props) {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [draft, setDraft] = useState("");
  const [savedDiary, setSavedDiary] = useState<Diary | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const confirm = useConfirm();
  const escalation = useEscalation();

  const loadDiaries = async () => {
    const items = await db.diaries.orderBy("createdAt").reverse().toArray();
    setDiaries(items);
  };

  useEffect(() => {
    void loadDiaries();
  }, []);

  const saveDiary = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isSaving) return;

    escalation.check(trimmed, "diary");

    setIsSaving(true);
    const now = Date.now();
    const diary: Diary = { content: trimmed, createdAt: now, updatedAt: now };
    const id = await db.diaries.add(diary);
    const created = { ...diary, id };

    setSavedDiary(created);
    setDiaries((items) => [created, ...items]);
    setDraft("");
    setIsSaving(false);
  };

  return (
    <section className="xuan-diary">
      <div className="xuan-diary-top-panel">
        <button className="xuan-back-btn" onClick={onBack}>← 返回</button>

        <header className="xuan-diary-header">
          <span>DIARY · 记录思绪</span>
          <h1>日记</h1>
          <p>先记下来，不急。也可以之后拿去跟心宝聊聊。</p>
        </header>
      </div>

      <div className="xuan-diary-entry">
        {savedDiary ? (
          <div className="xuan-diary-saved">
            <span>已保存 · {formatDate(savedDiary.createdAt)}</span>
            <p>{savedDiary.content}</p>
            <div className="xuan-diary-actions">
              <button onClick={() => onSpawnFromDiary(savedDiary)}>跟心宝聊聊这个</button>
              <button onClick={() => setSavedDiary(null)}>再写一篇</button>
            </div>
          </div>
        ) : (
          <>
            <textarea
              className="xuan-diary-textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="今天有什么纠结的、想不通的、或者想记住的..."
              rows={6}
            />
            <div className="xuan-diary-actions">
              <button onClick={saveDiary} disabled={isSaving || !draft.trim()}>
                {isSaving ? "保存中" : "保存日记"}
              </button>
            </div>
          </>
        )}
      </div>

      {diaries.length > 0 && (
        <div className="xuan-diary-list">
          {diaries.map((diary) => (
            <div className="xuan-diary-item" key={diary.id}>
              <time>{formatDate(diary.createdAt)}</time>
              <p>{diary.content.split("\n")[0].slice(0, 80)}</p>
              {diary.spawnedInstanceId != null && <small>已关联副本</small>}
              <button
                className="xuan-delete-btn"
                onClick={async () => {
                const ok = await confirm.ask("让这篇日记消散？");
                if (ok) { onDeleteDiary(diary.id!); setDiaries((items) => items.filter((d) => d.id !== diary.id)); }
              }}
                title="删除日记"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
