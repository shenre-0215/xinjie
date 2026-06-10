"use client";

import type { Role } from "../lib/db";
import { useConfirm } from "../lib/confirm";

type Props = {
  currentRole: Role | null;
  onBack: () => void;
  onContinueRole: (role: Role) => void;
  onChatWithRole: (role: Role) => void;
  onCreateBlankRole: () => void;
  onCreateRoleProfile: () => void;
  onDeleteRole: (id: number) => void;
  roles: Role[];
};

const phaseText: Record<string, string> = {
  unnamed: "未命名",
  observed: "已观察",
  named: "已命名",
  suspended: "已悬置",
};

function formatDate(value: number) {
  const d = new Date(value);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function RoleBoardScreen({ currentRole, onBack, onContinueRole, onChatWithRole, onCreateBlankRole, onCreateRoleProfile, onDeleteRole, roles }: Props) {
  const confirm = useConfirm();
  const namedCount = roles.filter((role) => role.phase === "named").length;
  const suspendedCount = roles.filter((role) => role.phase === "suspended").length;

  return (
    <section className="xuan-role-board">
      <div className="xuan-role-top-panel">
        <button className="xuan-back-btn" onClick={onBack}>← 返回</button>

        <header className="xuan-role-header">
          <span>ROLE BOARD · 面具生成台</span>
          <h1>角色</h1>
          <p>这里不是给你贴标签，而是生成一张可以反驳、修改、继续生长的自我画像。</p>
        </header>
      </div>

      <div className="xuan-role-summary" aria-label="角色概览">
        <p><em>角色数</em><strong>{roles.length}</strong></p>
        <p><em>已命名</em><strong>{namedCount}</strong></p>
        <p><em>已悬置</em><strong>{suspendedCount}</strong></p>
      </div>

      <article className="xuan-role-hero">
        <div className="xuan-role-mask" aria-hidden="true">
          <span>◠◠</span>
          <strong>{currentRole ? "◉" : "?"}</strong>
          <em>MASK</em>
        </div>
        <div>
          <span>当前显影角色</span>
          <h2>{currentRole?.title ?? "还没有生成角色"}</h2>
          <p>{currentRole ? `状态：${phaseText[currentRole.phase] ?? "未观察"} · HSR ${currentRole.hsr}% / CP ${currentRole.cp}%` : "先用 MBTI、星座、星盘、当前阶段和一句自述生成第一张临时画像。"}</p>
          <div className="xuan-role-actions">
            {currentRole && <button onClick={() => onContinueRole(currentRole)}>继续观察</button>}
            {currentRole && <button onClick={() => onChatWithRole(currentRole)}>跟心宝聊聊</button>}
            <button onClick={onCreateRoleProfile}>填写资料生成画像</button>
            <button onClick={onCreateBlankRole}>进入未命名角色</button>
          </div>
        </div>
      </article>

      {roles.length > 0 ? (
        <div className="xuan-role-grid">
          {roles.map((role) => (
            <div className="xuan-role-card" key={role.id}>
              <span>ROLE {String(role.id ?? 0).padStart(2, "0")}</span>
              <strong>{role.title}</strong>
              <em>{phaseText[role.phase] ?? "未观察"} · {formatDate(role.updatedAt)}</em>
              <small>HSR {role.hsr}% / CP {role.cp}%</small>
              <div className="xuan-role-actions">
                <button onClick={() => onContinueRole(role)}>继续观察</button>
                <button onClick={() => onChatWithRole(role)}>跟心宝聊聊</button>
                <button
                  className="xuan-delete-btn"
                  onClick={async () => { const ok = await confirm.ask(`让「${role.title}」消散？`); if (ok) onDeleteRole(role.id!); }}
                  title="删除角色"
                >×</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="xuan-role-rack-quiet">
          <span>ROLE RACK · 0</span>
          <em>第一个角色可以是未命名的——"未命名"本身也是一种诚实。</em>
        </div>
      )}
    </section>
  );
}
