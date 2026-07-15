import { getItem, removeItem, setItem } from './storage';

export type WorkspaceIconName = 'building' | 'landmark' | 'briefcase' | 'money' | 'handshake' | 'house' | 'store' | 'leaf' | 'scale' | 'people';

export interface Workspace {
  id: string;
  icon?: WorkspaceIconName;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const WORKSPACES_KEY = 'coopmanager_workspaces';
const ACTIVE_WORKSPACE_KEY = 'coopmanager_active_workspace';

export const workspaceDataKeys = [
  'coopmanager_config',
  'coopmanager_fontSize',
  'coopmanager_theme',
  'coopmanager_members',
  'coopmanager_loans',
  'coopmanager_contributions',
  'coopmanager_expenses',
  'coopmanager_transactions',
  'coopmanager_refunds',
  'coopmanager_activities',
  'coopmanager_cashbox',
] as const;

export type WorkspaceDataKey = (typeof workspaceDataKeys)[number];

export function getWorkspaceStorageKey(workspaceId: string, key: WorkspaceDataKey) {
  return `workspace:${workspaceId}:${key}`;
}

function createWorkspaceId() {
  return crypto.randomUUID();
}

function createInitialWorkspace(name: string): Workspace {
  const now = new Date().toISOString();
  return { id: createWorkspaceId(), name: name.trim(), icon: 'building', createdAt: now, updatedAt: now };
}

export async function initializeWorkspaces() {
  const existing = await getItem<Workspace[]>(WORKSPACES_KEY);
  const activeWorkspaceId = await getItem<string>(ACTIVE_WORKSPACE_KEY);

  if (existing?.length) {
    const activeWorkspace = existing.find((workspace) => workspace.id === activeWorkspaceId) ?? existing[0];
    if (activeWorkspace.id !== activeWorkspaceId) await setItem(ACTIVE_WORKSPACE_KEY, activeWorkspace.id);
    return { workspaces: existing, activeWorkspace };
  }

  const workspace = createInitialWorkspace('Principal');
  const legacyValues = await Promise.all(workspaceDataKeys.map(async (key) => [key, await getItem(key)] as const));

  await Promise.all([
    setItem(WORKSPACES_KEY, [workspace]),
    setItem(ACTIVE_WORKSPACE_KEY, workspace.id),
    ...legacyValues.flatMap(([key, value]) => value === null
      ? []
      : [setItem(getWorkspaceStorageKey(workspace.id, key), value), removeItem(key)]),
  ]);

  await window.coopmanagerPhotos?.migrateLegacy(workspace.id);

  return { workspaces: [workspace], activeWorkspace: workspace };
}

export async function createWorkspace(name: string, icon: WorkspaceIconName = 'building') {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('El nombre del espacio es obligatorio.');

  const workspaces = (await getItem<Workspace[]>(WORKSPACES_KEY)) ?? [];
  if (workspaces.some((workspace) => workspace.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) {
    throw new Error('Ya existe un espacio con ese nombre.');
  }

  const workspace = createWorkspaceRecord(normalizedName, icon);
  await setItem(WORKSPACES_KEY, [...workspaces, workspace]);
  return workspace;
}

function createWorkspaceRecord(name: string, icon: WorkspaceIconName = 'building'): Workspace {
  const now = new Date().toISOString();
  return { id: createWorkspaceId(), name, icon, createdAt: now, updatedAt: now };
}

export async function renameWorkspace(workspaceId: string, name: string) {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('El nombre del espacio es obligatorio.');

  const workspaces = (await getItem<Workspace[]>(WORKSPACES_KEY)) ?? [];
  if (workspaces.some((workspace) => workspace.id !== workspaceId && workspace.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) {
    throw new Error('Ya existe un espacio con ese nombre.');
  }

  const updated = workspaces.map((workspace) => workspace.id === workspaceId
    ? { ...workspace, name: normalizedName, updatedAt: new Date().toISOString() }
    : workspace);
  await setItem(WORKSPACES_KEY, updated);
  return updated;
}

export async function deleteWorkspaceData(workspaceId: string) {
  await Promise.all(workspaceDataKeys.map((key) => removeItem(getWorkspaceStorageKey(workspaceId, key))));
  await window.coopmanagerPhotos?.clearAll(workspaceId);
}

export async function setActiveWorkspace(workspaceId: string) {
  await setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
}
export async function saveWorkspaces(workspaces: Workspace[]) {
  await setItem(WORKSPACES_KEY, workspaces);
}
export async function updateWorkspaceIcon(workspaceId: string, icon: WorkspaceIconName) {
  const workspaces = (await getItem<Workspace[]>(WORKSPACES_KEY)) ?? [];
  const updated = workspaces.map((workspace) => workspace.id === workspaceId
    ? { ...workspace, icon, updatedAt: new Date().toISOString() }
    : workspace);
  await setItem(WORKSPACES_KEY, updated);
  return updated;
}
