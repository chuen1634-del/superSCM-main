export type AppRole = 'ADMIN' | 'USER';
export type AppUserProfile = { user_id: string; email: string; name: string; department: string; role: AppRole; active: boolean; last_login_at: string | null };

export function normalizeRole(value: unknown): AppRole | null { return value === 'ADMIN' || value === 'USER' ? value : null; }
export function canChangeOwnAccount(actorId: string, targetId: string, role: AppRole, active: boolean): boolean {
  return actorId !== targetId || (role === 'ADMIN' && active);
}
