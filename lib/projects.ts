export interface Project {
  id: string;
  name: string;
  mode: "cefis" | "free";
  topic: string;
  approach: string;
  messages: { role: string; content: string }[];
  studyPlan: unknown;
  profile: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  progress: number;
  gaps: string[];
  covered: string[];
}

const KEY = "cefis_projects";

export function getProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveProject(project: Project): void {
  const all = getProjects();
  const idx = all.findIndex((p) => p.id === project.id);
  const updated = { ...project, updatedAt: new Date().toISOString() };
  if (idx >= 0) all[idx] = updated;
  else all.unshift(updated);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function deleteProject(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getProjects().filter((p) => p.id !== id)));
}

export function getProject(id: string): Project | null {
  return getProjects().find((p) => p.id === id) ?? null;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
