import { replyNotes, unreadIds, FeedbackReply } from '../replies';

const fila = (o: Partial<FeedbackReply> = {}): FeedbackReply => ({
  id: 'r1',
  ticket_no: 'NS-0007',
  body: 'Lo hemos corregido en la próxima versión.',
  created_at: '2026-08-05T10:00:00Z',
  read_at: null,
  ...o,
});

describe('replyNotes', () => {
  it('mapea la fila a nota del feed con el ticket en el título', () => {
    const [n] = replyNotes([fila()], 'Respuesta a tu comentario', '#E8472A');
    expect(n.title).toBe('Respuesta a tu comentario · NS-0007');
    expect(n.body).toBe('Lo hemos corregido en la próxima versión.');
    expect(n.icon).toBe('💬');
    expect(n.unread).toBe(true);
  });

  it('más recientes primero', () => {
    const notas = replyNotes(
      [
        fila({ id: 'a', created_at: '2026-08-01T00:00:00Z', ticket_no: 'NS-0001' }),
        fila({ id: 'b', created_at: '2026-08-05T00:00:00Z', ticket_no: 'NS-0002' }),
      ],
      'T', '#000',
    );
    expect(notas.map((n) => n.title)).toEqual(['T · NS-0002', 'T · NS-0001']);
  });

  it('descarta cuerpos vacíos y aguanta null/undefined', () => {
    expect(replyNotes(null, 'T', '#000')).toEqual([]);
    expect(replyNotes(undefined, 'T', '#000')).toEqual([]);
    expect(replyNotes([fila({ body: '   ' })], 'T', '#000')).toEqual([]);
  });

  it('leída = no unread; la fecha inválida no revienta', () => {
    const [n] = replyNotes([fila({ read_at: '2026-08-05T11:00:00Z', created_at: 'basura' })], 'T', '#000');
    expect(n.unread).toBe(false);
    expect(n.when).toBe('');
  });

  it('no muta la entrada (función pura)', () => {
    const rows = [fila({ id: 'a', created_at: '2026-08-01T00:00:00Z' }),
                  fila({ id: 'b', created_at: '2026-08-05T00:00:00Z' })];
    const antes = rows.map((r) => r.id).join(',');
    replyNotes(rows, 'T', '#000');
    expect(rows.map((r) => r.id).join(',')).toBe(antes);
  });
});

describe('unreadIds', () => {
  it('solo las no leídas', () => {
    expect(unreadIds([fila({ id: 'a' }), fila({ id: 'b', read_at: '2026-08-05T00:00:00Z' })])).toEqual(['a']);
  });
  it('vacío con null', () => {
    expect(unreadIds(null)).toEqual([]);
  });
});
