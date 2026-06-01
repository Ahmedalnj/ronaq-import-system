import type { SupabaseClient } from '@supabase/supabase-js';

export function containerFullMessage(containerNumber: string, capacity: number) {
  const label = containerNumber || 'الحاوية';
  return `الحاوية ${label} ممتلئة (${capacity}/${capacity} سيارات). لا يمكن إضافة سيارة أخرى.`;
}

export async function assertContainerHasCapacity(
  supabase: SupabaseClient,
  userId: string,
  containerId: string | null | undefined,
  excludeCarId?: string,
  options?: { skipCapacityCheck?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!containerId || options?.skipCapacityCheck) {
    return { ok: true };
  }

  const { data: container, error: containerError } = await supabase
    .from('containers')
    .select('id, container_number, cars_count')
    .eq('id', containerId)
    .eq('user_id', userId)
    .single();

  if (containerError || !container) {
    return { ok: false, error: 'الحاوية المحددة غير موجودة' };
  }

  const capacity = Number(container.cars_count) || 6;

  const { data: carsInContainer, error: carsError } = await supabase
    .from('cars')
    .select('id')
    .eq('user_id', userId)
    .eq('container_id', containerId);

  if (carsError) {
    return { ok: false, error: 'تعذر التحقق من سعة الحاوية' };
  }

  const currentCount = (carsInContainer || []).filter((c) => c.id !== excludeCarId).length;

  if (currentCount >= capacity) {
    return {
      ok: false,
      error: containerFullMessage(container.container_number || container.id.substring(0, 8), capacity),
    };
  }

  return { ok: true };
}
