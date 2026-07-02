import { supabase } from './supabase';

export type BasicItem = { item_name: string; nutrient_tag: string | null };
export type MovementItem = { item_name: string; category_tag: string | null; intensity: string | null };
export type Tips = { daily_tip?: string; body_insight?: string; movement_tip?: string };

/** Nutri Basics food list for a phase (§7.4). `phase` is the 4-phase display key. */
export async function fetchBasics(phase: string): Promise<BasicItem[]> {
  const { data } = await supabase
    .from('phase_food').select('item_name,nutrient_tag').eq('phase', phase).order('sort');
  return (data as BasicItem[]) ?? [];
}

/** Movement activities (§8.3) — shared across phases. */
export async function fetchMovement(): Promise<MovementItem[]> {
  const { data } = await supabase
    .from('movement_activity').select('item_name,category_tag,intensity').order('sort');
  return (data as MovementItem[]) ?? [];
}

/** Daily tip / body insight / movement tip for a phase (§7.2, §8.2). */
export async function fetchTips(phase: string): Promise<Tips> {
  const { data } = await supabase.from('phase_tip').select('kind,body').eq('phase', phase);
  const out: Tips = {};
  (data ?? []).forEach((r: any) => {
    if (r.kind === 'daily_tip') out.daily_tip = r.body;
    if (r.kind === 'body_insight') out.body_insight = r.body;
    if (r.kind === 'movement_tip') out.movement_tip = r.body;
  });
  return out;
}
