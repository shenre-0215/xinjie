import Dexie, { type Table } from "dexie";

export type InstanceStatus = "active" | "paused" | "closed";
export type InstancePhase = "unnamed" | "observed" | "named" | "suspended";
export type SentinelAction = "observe" | "name" | "suspend";
export type InstanceSource = "direct" | "diary";

export type RoleProfileInput = {
  mbti: string;
  zodiac: string;
  bazi: string;
  lifeStage: string;
  currentQuestion: string;
};

export type RoleSubRole = {
  name: string;
  description: string;
};

export type SourceTag = "user_quote" | "mbti" | "zodiac" | "bazi" | "life_stage" | "ai_inference";

export type FieldUncertainty = {
  kappa: number;
  expectation: number;
  delta: number;
  sources: SourceTag[];
  note?: string;
};

export type RoleProfile = {
  mainRoleName: string;
  mainRoleSummary: string;
  coreMotivation: string;
  defensePattern: string;
  highEnergyState: string;
  lowEnergyState: string;
  conflictPoint: string;
  suggestedRelationship: string;
  sourceBadges: string[];
  subRoles: RoleSubRole[];
  followUpQuestions: string[];
  fieldUncertainty?: Partial<Record<
    "mainRoleName" | "mainRoleSummary" | "coreMotivation" | "defensePattern"
    | "highEnergyState" | "lowEnergyState" | "conflictPoint" | "suggestedRelationship",
    FieldUncertainty
  >>;
  baziChart?: string;
  ageAtGeneration?: number;
  generatedAt?: number;
};

export type DialogueMessage = {
  id: number;
  speaker: "user" | "ai";
  text: string;
};

export type Instance = {
  id?: number;
  source: InstanceSource;
  title: string;
  status: InstanceStatus;
  phase: InstancePhase;
  hsr: number;
  cp: number;
  createdAt: number;
  updatedAt: number;
  suspendedAt?: number;
  checkBackDays?: number;
  sourceDiaryId?: number;
  landingPoint?: string;
  messages?: DialogueMessage[];
};

export type Role = {
  id?: number;
  title: string;
  status: InstanceStatus;
  phase: InstancePhase;
  hsr: number;
  cp: number;
  createdAt: number;
  updatedAt: number;
  profile?: RoleProfile;
  profileInput?: RoleProfileInput;
};

export type Diary = {
  id?: number;
  content: string;
  spawnedInstanceId?: number;
  createdAt: number;
  updatedAt: number;
};

export type RoleProfileSnapshot = {
  id?: number;
  instanceId: number;
  profile: RoleProfile;
  input: RoleProfileInput;
  calibration: string;
  createdAt: number;
};

export type SentinelLog = {
  id?: number;
  instanceId: number;
  action: SentinelAction;
  message: string;
  hsr: number;
  cp: number;
  hsrDelta: number;
  cpDelta: number;
  phase: InstancePhase;
  createdAt: number;
};

class XuanDatabase extends Dexie {
  instances!: Table<Instance, number>;
  sentinelLogs!: Table<SentinelLog, number>;
  roleProfileSnapshots!: Table<RoleProfileSnapshot, number>;
  roles!: Table<Role, number>;
  diaries!: Table<Diary, number>;

  constructor() {
    super("xuan-mvp");

    this.version(1).stores({
      instances: "++id, status, createdAt, updatedAt",
    });

    this.version(2)
      .stores({
        instances: "++id, kind, status, createdAt, updatedAt",
      })
      .upgrade((transaction) =>
        transaction.table("instances").toCollection().modify((instance) => {
          instance.kind = instance.kind ?? "instance";
        }),
      );

    this.version(3).stores({
      instances: "++id, kind, status, createdAt, updatedAt",
      sentinelLogs: "++id, instanceId, action, createdAt",
    });

    this.version(4)
      .stores({
        instances: "++id, kind, status, phase, createdAt, updatedAt",
        sentinelLogs: "++id, instanceId, action, phase, createdAt",
      })
      .upgrade((transaction) =>
        transaction.table("instances").toCollection().modify((instance) => {
          instance.phase = instance.phase ?? "unnamed";
        }),
      );

    this.version(5).stores({
      instances: "++id, kind, status, phase, createdAt, updatedAt",
      sentinelLogs: "++id, instanceId, action, phase, createdAt",
      roleProfileSnapshots: "++id, instanceId, createdAt",
    });

    this.version(6)
      .stores({
        instances: "++id, source, status, phase, createdAt, updatedAt",
        sentinelLogs: "++id, instanceId, action, phase, createdAt",
        roleProfileSnapshots: "++id, instanceId, createdAt",
        roles: "++id, status, phase, createdAt, updatedAt",
        diaries: "++id, createdAt, updatedAt",
      })
      .upgrade(async (transaction) => {
        const all = await transaction.table("instances").toArray();

        for (const item of all) {
          if (item.kind === "role") {
            await transaction.table("roles").add({
              title: item.title,
              status: item.status,
              phase: item.phase,
              hsr: item.hsr,
              cp: item.cp,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              profile: item.profile,
              profileInput: item.profileInput,
            });
          }
        }

        await transaction.table("instances").toCollection().modify((item) => {
          item.source = "direct";
        });

        const roleIds = all
          .filter((i) => i.kind === "role")
          .map((i) => i.id)
          .filter(Boolean) as number[];
        if (roleIds.length > 0) {
          await transaction.table("instances").bulkDelete(roleIds);
        }
      });
  }
}

export const db = new XuanDatabase();
