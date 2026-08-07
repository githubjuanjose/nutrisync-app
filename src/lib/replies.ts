/**
 * Respuestas del equipo al feedback de la usuaria (r13 · tickets).
 *
 * Lógica PURA (regla r11c-2): el IO consume, los tests cubren. La pantalla
 * de notificaciones llama a estas funciones con las filas que le dé Supabase;
 * aquí no se importa nada con efectos.
 */

export type FeedbackReply = {
  id: string;
  ticket_no: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type ReplyNote = {
  icon: string;
  title: string;
  body: string;
  accent: string;
  when: string;
  unread: boolean;
};

/** Filas → notas del feed, más recientes primero, sin cuerpos vacíos. */
export function replyNotes(
  rows: FeedbackReply[] | null | undefined,
  title: string,
  accent: string,
  locale?: string,
): ReplyNote[] {
  return (rows ?? [])
    .filter((r) => r && typeof r.body === 'string' && r.body.trim().length > 0)
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((r) => ({
      icon: '💬',
      title: `${title} · ${r.ticket_no}`,
      body: r.body.trim(),
      accent,
      when: fechaCorta(r.created_at, locale),
      unread: r.read_at == null,
    }));
}

/** Ids pendientes de marcar como leídas (para el update fire-and-forget). */
export function unreadIds(rows: FeedbackReply[] | null | undefined): string[] {
  return (rows ?? []).filter((r) => r && r.read_at == null).map((r) => r.id);
}

function fechaCorta(iso: string, locale?: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}
