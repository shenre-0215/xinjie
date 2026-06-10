"use client";

import type { Diary, Instance, Role } from "../lib/db";
import { useConfirm } from "../lib/confirm";

const phaseLabels: Record<string, string> = {
  unnamed: "未观察",
  observed: "已观察",
  named: "已命名",
  suspended: "已悬置",
};

function formatDate(value: number) {
  const d = new Date(value);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type Props = {
  instances: Instance[];
  roles: Role[];
  diaries: Diary[];
  onBack: () => void;
  onContinueInstance: (instance: Instance) => void;
  onContinueRole: (role: Role) => void;
  onDeleteInstance: (id: number) => void;
  onDeleteRole: (id: number) => void;
  onDeleteDiary: (id: number) => void;
};

function SectionLabel({ children }: { children: string }) {
  return <span style={{ color: "rgba(123, 143, 168, 0.78)", fontFamily: '"Courier New", monospace', fontSize: "0.76rem", letterSpacing: "0.12em" }}>{children}</span>;
}

export function LibraryScreen({ instances, roles, diaries, onBack, onContinueInstance, onContinueRole, onDeleteInstance, onDeleteRole, onDeleteDiary }: Props) {
  const confirm = useConfirm();
  const meaningfulInstances = instances.filter((i) => i.title || i.phase !== "unnamed");
  return (
    <section className="xuan-primer-card">
      <button className="xuan-back-btn" onClick={onBack}>← 返回</button>

      <h1 className="xuan-primer-title">心解库</h1>

      <div className="xuan-primer-copy">
        <p>你记过的、聊过的、悬置的，都在这里。</p>
      </div>

      {diaries.length > 0 && (
        <div>
          <SectionLabel>日记</SectionLabel>
          <div className="xuan-library-list" style={{ marginTop: "0.4rem" }}>
            {diaries.map((diary) => (
              <div className="xuan-library-row" key={diary.id}>
                <button>
                  <span>{formatDate(diary.createdAt)}</span>
                  <strong>{diary.content.split("\n")[0].slice(0, 40)}</strong>
                  {diary.spawnedInstanceId != null && <em>已关联副本</em>}
                </button>
                <button
                  className="xuan-delete-btn"
                  onClick={async () => { const ok = await confirm.ask("让这篇日记消散？"); if (ok) onDeleteDiary(diary.id!); }}
                  title="删除日记"
                >×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {meaningfulInstances.length > 0 && (
        <div>
          <SectionLabel>副本</SectionLabel>
          <div className="xuan-library-list" style={{ marginTop: "0.4rem" }}>
            {meaningfulInstances.map((instance) => (
              <div className="xuan-library-row" key={instance.id}>
                <button onClick={() => onContinueInstance(instance)}>
                  <span>INSTANCE {String(instance.id ?? 0).padStart(2, "0")} · {instance.source === "diary" ? "来自日记" : "直接创建"}</span>
                  <strong>{instance.title || "未命名"}</strong>
                  {instance.landingPoint && <small>{instance.landingPoint}</small>}
                  <em>{phaseLabels[instance.phase] ?? "未观察"} · {formatDate(instance.updatedAt)}</em>
                </button>
                <button
                  className="xuan-delete-btn"
                  onClick={async () => { const ok = await confirm.ask(`让「${instance.title || "这个副本"}」消散？`); if (ok) onDeleteInstance(instance.id!); }}
                  title="删除副本"
                >×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {roles.length > 0 && (
        <div>
          <SectionLabel>角色</SectionLabel>
          <div className="xuan-library-list" style={{ marginTop: "0.4rem" }}>
            {roles.map((role) => (
              <div className="xuan-library-row" key={role.id}>
                <button onClick={() => onContinueRole(role)}>
                  <span>ROLE {String(role.id ?? 0).padStart(2, "0")}</span>
                  <strong>{role.title}</strong>
                  <em>{phaseLabels[role.phase] ?? "未观察"} · {formatDate(role.updatedAt)}</em>
                </button>
                <button
                  className="xuan-delete-btn"
                  onClick={async () => { const ok = await confirm.ask(`让「${role.title}」消散？`); if (ok) onDeleteRole(role.id!); }}
                  title="删除角色"
                >×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {meaningfulInstances.length === 0 && roles.length === 0 && diaries.length === 0 && (
        <div className="xuan-empty-panel">
          <span>EMPTY LIBRARY</span>
          <p>还没有任何记录。记一篇日记，或者跟心宝聊一次，就会出现在这里。</p>
        </div>
      )}
    </section>
  );
}
