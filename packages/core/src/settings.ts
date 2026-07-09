import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { Workspace } from "./workspace.js";
import { getSheafPaths } from "./workspace.js";

/**
 * Operator preferences for a workspace (.sheaf/config.json).
 * Kept small on purpose — local casefile prefs, not multi-user profiles.
 */
export const SheafSettingsSchema = z.object({
  version: z.number().default(1),
  createdAt: z.number().optional(),
  /** Engagement id used by `sheaf wrap` and console capture when -e omitted */
  activeEngagementId: z.string().nullable().default(null),
  /** Default report filter in UI */
  reportConfirmedOnly: z.boolean().default(false),
  /** After wrap/run, auto-import machine-readable output */
  autoImportOnWrap: z.boolean().default(true),
  /** Console default cwd: workspace root or engagement evidence folder */
  consoleCwd: z.enum(["workspace", "engagement"]).default("workspace"),
  /** Compact UI density (web) */
  uiDensity: z.enum(["comfortable", "compact"]).default("comfortable"),
});

export type SheafSettings = z.infer<typeof SheafSettingsSchema>;

export const UpdateSettingsInput = SheafSettingsSchema.partial().omit({
  version: true,
  createdAt: true,
});
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsInput>;

function configPath(ws: Workspace): string {
  return getSheafPaths(ws.root).configPath;
}

function readRaw(ws: Workspace): Record<string, unknown> {
  const p = configPath(ws);
  if (!fs.existsSync(p)) {
    return { version: 1, createdAt: Date.now() };
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
  } catch {
    return { version: 1, createdAt: Date.now() };
  }
}

function writeRaw(ws: Workspace, data: Record<string, unknown>): void {
  const p = configPath(ws);
  fs.mkdirSync(path.dirname(p), { recursive: true, mode: 0o700 });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
}

export function getSettings(ws: Workspace): SheafSettings {
  const raw = readRaw(ws);
  const parsed = SheafSettingsSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  // merge defaults over broken file
  return SheafSettingsSchema.parse({
    version: 1,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    activeEngagementId: raw.activeEngagementId ?? null,
    reportConfirmedOnly: raw.reportConfirmedOnly ?? false,
    autoImportOnWrap: raw.autoImportOnWrap ?? true,
    consoleCwd: raw.consoleCwd === "engagement" ? "engagement" : "workspace",
    uiDensity: raw.uiDensity === "compact" ? "compact" : "comfortable",
  });
}

export function updateSettings(ws: Workspace, input: UpdateSettingsInput): SheafSettings {
  const patch = UpdateSettingsInput.parse(input);
  const current = readRaw(ws);
  const next = {
    ...current,
    ...patch,
    version: 1,
    createdAt:
      typeof current.createdAt === "number" ? current.createdAt : Date.now(),
    updatedAt: Date.now(),
  };
  const validated = SheafSettingsSchema.parse(next);
  writeRaw(ws, { ...next, ...validated });
  return getSettings(ws);
}

/** Resolve engagement for wrap/capture: explicit id, else settings.activeEngagementId */
export function resolveActiveEngagementId(
  ws: Workspace,
  explicit?: string | null,
): string {
  if (explicit?.trim()) return explicit.trim();
  const s = getSettings(ws);
  if (s.activeEngagementId?.trim()) return s.activeEngagementId.trim();
  throw new Error(
    "No engagement selected. Pass -e <id> or set active engagement in Settings / `sheaf settings set --active <id>`.",
  );
}
