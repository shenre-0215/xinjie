"use client";

import { useEffect, useState } from "react";
import { DiaryScreen } from "./components/DiaryScreen";
import { GateUtilityScreen } from "./components/GateUtilityScreen";
import { InstanceScreen } from "./components/InstanceScreen";
import { LandingScreen } from "./components/LandingScreen";
import { LibraryScreen } from "./components/LibraryScreen";
import { ParticleCanvas } from "./components/ParticleCanvas";
import { PrimerScreen } from "./components/PrimerScreen";
import { RoleBoardScreen } from "./components/RoleBoardScreen";
import { DashboardScreen } from "./components/DashboardScreen";
import { RoleProfileScreen } from "./components/RoleProfileScreen";
import { XuanShell, type XuanSection } from "./components/XuanShell";
import { XuanConfirm } from "./components/XuanConfirm";
import { CriticalEscalationModal } from "./components/CriticalEscalationModal";
import { OnboardingScreen, hasOnboarded } from "./components/OnboardingScreen";
import { db, type Diary, type Instance, type Role, type RoleProfile, type RoleProfileInput } from "./lib/db";
import { DEFAULT_INSTANCE_HSR, DEFAULT_INSTANCE_CP, DEFAULT_ROLE_HSR, DEFAULT_ROLE_CP } from "./lib/suspension";

type Screen = "landing" | "onboarding" | "primer" | "instance" | "roleBoard" | "roleProfile" | "library" | "settings" | "notifications" | "profile" | "diary" | "guide";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const recentInstances = instances.slice(0, 3);

  const loadData = async () => {
    const [recentInstances, recentRoles, recentDiaries] = await Promise.all([
      db.instances.orderBy("updatedAt").reverse().toArray(),
      db.roles.orderBy("updatedAt").reverse().toArray(),
      db.diaries.orderBy("createdAt").reverse().toArray(),
    ]);
    setInstances(recentInstances);
    setRoles(recentRoles);
    setDiaries(recentDiaries);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const createInstance = async () => {
    const now = Date.now();
    const instance: Instance = {
      source: "direct",
      title: "",
      status: "active",
      phase: "unnamed",
      hsr: DEFAULT_INSTANCE_HSR,
      cp: DEFAULT_INSTANCE_CP,
      createdAt: now,
      updatedAt: now,
    };
    const id = await db.instances.add(instance);
    const created = { ...instance, id };

    setCurrentInstance(created);
    setCurrentRole(null);
    setInstances((items) => [created, ...items.filter((item) => item.id !== created.id)]);
    setScreen("instance");
  };

  const continueInstance = (instance: Instance) => {
    setCurrentInstance(instance);
    setCurrentRole(null);
    setScreen("instance");
  };

  const chatWithRole = (role: Role) => {
    setCurrentRole(role);
    setCurrentInstance(null);
    setScreen("instance");
  };

  const spawnFromDiary = async (diary: Diary) => {
    const now = Date.now();
    const instance: Instance = {
      source: "diary",
      sourceDiaryId: diary.id,
      title: diary.content.split("\n")[0].slice(0, 40),
      status: "active",
      phase: "unnamed",
      hsr: DEFAULT_INSTANCE_HSR,
      cp: DEFAULT_INSTANCE_CP,
      createdAt: now,
      updatedAt: now,
    };

    const id = await db.instances.add(instance);
    const created = { ...instance, id };

    await db.diaries.update(diary.id!, { spawnedInstanceId: id });
    setDiaries((items) => items.map((d) => (d.id === diary.id ? { ...d, spawnedInstanceId: id } : d)));

    setCurrentInstance(created);
    setCurrentRole(null);
    setInstances((items) => [created, ...items]);
    setScreen("instance");
  };

  const saveRoleProfile = async (payload: {
    profile: RoleProfile;
    input: RoleProfileInput;
    calibrations: string[];
  }) => {
    const { profile, input, calibrations } = payload;
    const now = Date.now();
    const role: Role = {
      title: profile.mainRoleName || "一个尚未命名的角色",
      status: "active",
      phase: "named",
      hsr: DEFAULT_ROLE_HSR,
      cp: DEFAULT_ROLE_CP,
      createdAt: now,
      updatedAt: now,
      profile,
      profileInput: input,
    };
    const id = await db.roles.add(role);
    const created = { ...role, id };

    const calibrationTrace = calibrations.length > 0 ? calibrations.join("\n---\n") : "";
    await db.roleProfileSnapshots.add({
      instanceId: id,
      profile,
      input,
      calibration: calibrationTrace,
      createdAt: now,
    });

    setRoles((items) => [created, ...items]);
    setCurrentRole(created);
    setScreen("roleBoard");

    return created;
  };

  const deleteInstance = async (id: number) => {
    await db.transaction("rw", db.instances, db.sentinelLogs, async () => {
      await db.sentinelLogs.where("instanceId").equals(id).delete();
      await db.instances.delete(id);
    });
    if (currentInstance?.id === id) {
      setCurrentInstance(null);
      setScreen("primer");
    }
    setInstances((items) => items.filter((i) => i.id !== id));
  };

  const deleteRole = async (id: number) => {
    await db.transaction("rw", db.roles, db.roleProfileSnapshots, async () => {
      await db.roleProfileSnapshots.where("instanceId").equals(id).delete();
      await db.roles.delete(id);
    });
    if (currentRole?.id === id) {
      setCurrentRole(null);
      setScreen("roleBoard");
    }
    setRoles((items) => items.filter((r) => r.id !== id));
  };

  const deleteDiary = async (id: number) => {
    await db.diaries.delete(id);
    setDiaries((items) => items.filter((d) => d.id !== id));
  };

  const navigateSection = (nextSection: XuanSection) => {
    if (nextSection === "gate") {
      setScreen("primer");
      return;
    }

    if (nextSection === "diary") {
      setScreen("diary");
      return;
    }

    if (nextSection === "library") {
      setScreen("library");
      return;
    }

    if (nextSection === "role") {
      setScreen("roleBoard");
      return;
    }

    if (currentInstance || currentRole) {
      setScreen("instance");
      return;
    }

    void createInstance();
  };

  const section: XuanSection =
    screen === "guide" ? "gate"
    : screen === "library" ? "library"
    : screen === "roleBoard" || screen === "roleProfile" ? "role"
    : screen === "diary" ? "diary"
    : screen === "primer" || screen === "settings" || screen === "notifications" || screen === "profile" ? "gate"
    : screen === "instance" ? (currentRole ? "role" : "instance")
    : "gate";

  const stage =
    screen === "guide" ? "心门 · 新手指南"
    : screen === "settings" ? "心门 · 设置"
    : screen === "notifications" ? "心门 · 通知"
    : screen === "profile" ? "心门 · 档案"
    : screen === "diary" ? "日记 · 记录思绪"
    : section === "gate" ? "心门 · 主城"
    : section === "library" ? "心解库 · 全部记录"
    : screen === "roleBoard" ? `角色 · ${roles.length} 个面具`
    : screen === "roleProfile" ? "角色 · 自我画像生成"
    : currentInstance ? `INSTANCE ${String(currentInstance.id ?? 0).padStart(2, "0")} · ${currentInstance.phase}`
    : currentRole ? `ROLE · ${currentRole.title}`
    : "副本 · 待生成";

  const content =
    screen === "primer" ? (
      <PrimerScreen
        onChooseKind={createInstance}
        onContinueInstance={continueInstance}
        onOpenDiary={() => setScreen("diary")}
        onOpenLibrary={() => setScreen("library")}
        onOpenNotifications={() => setScreen("notifications")}
        onOpenProfile={() => setScreen("profile")}
        onOpenRoleBoard={() => setScreen("roleBoard")}
        onOpenSettings={() => setScreen("settings")}
        instances={instances}
        recentInstances={recentInstances}
        roles={roles}
      />
    ) : screen === "settings" ? (
      <GateUtilityScreen kind="settings" onBack={() => setScreen("primer")} />
    ) : screen === "notifications" ? (
      <GateUtilityScreen kind="notifications" instances={instances} onBack={() => setScreen("primer")} onContinueInstance={continueInstance} />
    ) : screen === "profile" ? (
      <DashboardScreen
        instances={instances}
        roles={roles}
        diaries={diaries}
        onBack={() => setScreen("primer")}
        onContinueInstance={continueInstance}
      />
    ) : screen === "diary" ? (
      <DiaryScreen
        onBack={() => setScreen("primer")}
        onSpawnFromDiary={spawnFromDiary}
        onDeleteDiary={deleteDiary}
      />
    ) : screen === "roleBoard" ? (
      <RoleBoardScreen
        currentRole={currentRole}
        onBack={() => setScreen("primer")}
        onContinueRole={(role) => { setCurrentRole(role); }}
        onChatWithRole={chatWithRole}
        onCreateBlankRole={createInstance}
        onCreateRoleProfile={() => setScreen("roleProfile")}
        onDeleteRole={deleteRole}
        roles={roles}
      />
    ) : screen === "roleProfile" ? (
      <RoleProfileScreen
        onBack={() => setScreen("roleBoard")}
        onSaveRole={saveRoleProfile}
      />
    ) : screen === "library" ? (
      <LibraryScreen
        instances={instances}
        roles={roles}
        diaries={diaries}
        onBack={() => setScreen("primer")}
        onContinueInstance={continueInstance}
        onContinueRole={chatWithRole}
        onDeleteInstance={deleteInstance}
        onDeleteRole={deleteRole}
        onDeleteDiary={deleteDiary}
      />
    ) : screen === "guide" ? (
      <OnboardingScreen onDone={() => setScreen("primer")} onBack={() => setScreen("primer")} />
    ) : (
      <InstanceScreen
        instance={currentInstance}
        role={currentRole}
        allRoles={roles}
        allInstances={instances}
        onBack={() => {
          if (currentRole) {
            setScreen("roleBoard");
          } else {
            setScreen("primer");
          }
        }}
        onInstanceChange={(instance) => {
          setCurrentInstance(instance);
          setInstances((items) => [instance, ...items.filter((item) => item.id !== instance.id)]);
        }}
        onDeleteInstance={(id) => { void deleteInstance(id); }}
        onSuspend={() => { setCurrentInstance(null); setScreen("primer"); }}
      />
    );

  return (
    <main className="xuan-home">
      <ParticleCanvas />

      {screen === "landing" ? (
        <LandingScreen onStart={() => setScreen(hasOnboarded() ? "primer" : "onboarding")} />
      ) : screen === "onboarding" ? (
        <OnboardingScreen onDone={() => setScreen("primer")} />
      ) : (
        <>
          <XuanConfirm />
          <CriticalEscalationModal />
          <XuanShell
          currentInstance={currentInstance}
          recentInstances={recentInstances}
          section={section}
          stage={stage}
          onContinueInstance={continueInstance}
          onNavigate={navigateSection}
          onOpenGuide={() => setScreen("guide")}
        >
          {content}
        </XuanShell>
        </>
      )}
    </main>
  );
}
