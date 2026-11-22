import type { Database } from '@/integrations/supabase/types';
export type Status = Database['public']['Enums']['content_status'];
export type Kind = Database['public']['Enums']['content_kind'];
export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const canEdit = (status: Status) => status === 'PENDING' || status === 'REJECTED';
export const canDeleteUnreviewed = (status: Status, reviewedAt: string | null) => status === 'PENDING' && reviewedAt === null;
export const canReport = (role: 'creator' | 'moderator', status: Status) => role === 'moderator' && status === 'VALIDATED';
export function canTransition(role: 'creator' | 'moderator', from: Status, to: Status) {
  if (role === 'creator') return canEdit(from) && to === 'PENDING';
  return (from === 'PENDING' && (to === 'VALIDATED' || to === 'REJECTED')) || (from === 'VALIDATED' && to === 'REMOVED') || (from === 'REMOVED' && to === 'VALIDATED');
}
export function validMedia(file: { size: number; type: string }) { return file.size <= MAX_FILE_SIZE && /^(image\/|video\/|application\/pdf$)/.test(file.type); }
export function safeUrl(value: string) { try { return new URL(value).protocol === 'https:'; } catch { return false; } }