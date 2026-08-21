/**
 * EditarEscaneo (UST-04 F6, 0.22.6) — reabrir una comida por foto y corregirla.
 *
 * NS-0069 («history enseña alimentos incorrectos») + NS-0070 («quiero borrar
 * un alimento del escaneo») + la mitad pendiente de NS-0057 + el vino
 * fantasma de la Coca-Cola (NS-0072). UNA verdad: los items vivos de
 * meal_capture_items. Tras cada cambio: re-alineación (re-stats + gaps),
 * resync de la descripción en meal_logs y recompute del CAS — la cadena
 * entera, no el tramo tocado (r18-d).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { font } from '../../theme';
import { useT } from '../../i18n';
import { useSession } from '../../state/SessionProvider';
import { supabase } from '../../lib/supabase';
import { recomputeCAS } from '../../lib/daily';
import { resincronizaDescripcion } from '../../lib/foto';
import { cargaGlosario, decoraNombre } from '../../lib/glosario';
import { Alineacion, parseAlineacion, tierDeItem, claveDeTier, Tier } from '../../lib/alineacion';

const P = {
  ink: '#3D1E25', sub: '#7D6469', naranja: '#FF5D00',
  rosaTop: '#F9DCD7', crema: '#FFFBF9', linea: '#F3E6E1', chipBg: '#F5F0F2',
  blanco: '#FFFFFF',
};
const TIER_DOT: Record<Tier, string> = {
  Excellent: '#22C55E', Great: '#4CAF50', Good: '#F59E0B', Fair: '#9E9E9E',
} as Record<Tier, string>;

type Item = { id: string; detected_name: string; portion_description: string | null };

export default function EditarEscaneoScreen({ route }: any) {
  const t = useT();
  const nav = useNavigation<any>();
  const { userId } = useSession();
  const mealId: string = route?.params?.mealId;
  const mealLogId: number | undefined = route?.params?.mealLogId;

  const [items, setItems] = useState<Item[]>([]);
  const [alin, setAlin] = useState<Alineacion>(() => parseAlineacion(null));
  const [cargando, setCargando] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTxt, setEditTxt] = useState('');

  useEffect(() => { cargaGlosario().then(() => setItems((p) => [...p]), () => {}); }, []);

  const carga = useCallback(async () => {
    if (!mealId) return;
    const filas = await supabase.from('meal_capture_items')
      .select('id, detected_name, portion_description')
      .eq('meal_id', mealId).order('created_at');
    setItems(((filas.data ?? []) as Item[]));
    supabase.rpc('meal_alignment', { p_meal_id: mealId })
      .then((r) => setAlin(parseAlineacion(r.data)), () => {});
    setCargando(false);
  }, [mealId]);
  useFocusEffect(useCallback(() => { carga(); }, [carga]));

  // Tras cualquier cambio: la cadena entera.
  const resincroniza = useCallback(async () => {
    await carga();
    try {
      const vivos = await supabase.from('meal_capture_items')
        .select('detected_name').eq('meal_id', mealId).order('created_at');
      const nombres = (vivos.data ?? []).map((f: any) => String(f.detected_name ?? ''));
      const filtro = mealLogId
        ? supabase.from('meal_logs').select('id, description').eq('id', mealLogId).maybeSingle()
        : supabase.from('meal_logs').select('id, description').eq('capture_id', mealId).maybeSingle();
      const log = await filtro;
      if (log.data) {
        await supabase.from('meal_logs')
          .update({ description: resincronizaDescripcion(log.data.description, nombres) })
          .eq('id', log.data.id);
      }
      if (userId) recomputeCAS(userId).then(() => {}, () => {});
    } catch { /* la próxima edición reintenta */ }
  }, [carga, mealId, mealLogId, userId]);

  const borra = async (it: Item) => {
    try { await supabase.from('meal_capture_items').delete().eq('id', it.id); await resincroniza(); } catch {}
  };

  const corrige = async (it: Item) => {
    const limpio = editTxt.trim();
    setEditId(null);
    if (!limpio || limpio === it.detected_name) return;
    try {
      await supabase.from('meal_capture_edits').insert({
        meal_id: mealId, user_id: userId, edit_reason: 'nombre',
        before_value: { name: it.detected_name }, after_value: { name: limpio },
      }).then(() => {}, () => {});
      await supabase.from('meal_capture_items').update({ detected_name: limpio }).eq('id', it.id);
      await resincroniza();
    } catch { /* sin drama */ }
  };

  return (
    <View style={s.fill}>
      <LinearGradient colors={[P.rosaTop, P.crema]} locations={[0, 0.55]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
        <View style={s.header}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}><Text style={s.back}>‹</Text></Pressable>
          <Text style={s.titulo}>{t('mob.editor.titulo', 'Edit scanned meal')}</Text>
          <View style={{ width: 24 }} />
        </View>

        {cargando ? (
          <View style={s.centro}><ActivityIndicator size="large" color={P.naranja} /></View>
        ) : (
          <ScrollView contentContainerStyle={s.cuerpo}>
            <Text style={s.pista}>{t('mob.editor.pista',
              'Tap a name to fix it, ✕ to remove it. Your history and score update with you.')}</Text>

            <View style={s.card}>
              {items.map((it, i) => {
                const tr = tierDeItem(alin, it.detected_name);
                return (
                  <View key={it.id} style={[s.fila, i > 0 && s.filaBorde]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      {editId === it.id ? (
                        <View style={s.editFila}>
                          <TextInput value={editTxt} onChangeText={setEditTxt} autoFocus
                            style={s.editInput} returnKeyType="done"
                            onSubmitEditing={() => corrige(it)} />
                          <Pressable hitSlop={8} onPress={() => corrige(it)}>
                            <Text style={s.editOk}>✓</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable onPress={() => { setEditId(it.id); setEditTxt(it.detected_name); }} hitSlop={6}>
                          <Text style={s.nom}>{decoraNombre(it.detected_name)}<Text style={s.lapiz}>  ✎</Text></Text>
                        </Pressable>
                      )}
                      {!!it.portion_description && <Text style={s.por}>{it.portion_description}</Text>}
                    </View>
                    <View style={s.lado}>
                      {tr ? (
                        <View style={s.pill}>
                          <View style={[s.dot, { backgroundColor: TIER_DOT[tr] }]} />
                          <Text style={s.pillTxt}>{t(claveDeTier(tr), tr)}</Text>
                        </View>
                      ) : alin.activo ? (
                        <View style={[s.pill, s.pillNeutra]}>
                          <Text style={s.pillNeutraTxt}>{t('mob.foto.sinScore', 'No score yet')}</Text>
                        </View>
                      ) : null}
                      <Pressable hitSlop={10} onPress={() => borra(it)}>
                        <Text style={s.borra}>✕</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
              {!items.length && (
                <Text style={s.vacio}>{t('mob.editor.vacio', 'Nothing left — add an ingredient below.')}</Text>
              )}
            </View>

            <Pressable onPress={() => nav.navigate('AddIngredients', { mealId })} hitSlop={8}>
              <Text style={s.addMas}>＋ {t('mob.foto.addMas', 'Add more ingredients')}</Text>
            </Pressable>

            <Pressable style={s.boton} onPress={() => nav.goBack()}>
              <Text style={s.botonTxt}>{t('mob.editor.listo', 'Done')}</Text>
            </Pressable>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6 },
  back: { fontFamily: font.bold, fontSize: 28, color: P.ink, width: 24 },
  titulo: { fontFamily: font.bold, fontSize: 17, color: P.ink },
  cuerpo: { padding: 18, paddingBottom: 40 },
  pista: { fontFamily: font.regular, fontSize: 13, color: P.sub, marginBottom: 12 },
  card: { backgroundColor: P.blanco, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderColor: P.linea },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  filaBorde: { borderTopWidth: 1, borderTopColor: P.linea },
  nom: { fontFamily: font.semibold, fontSize: 15, color: P.ink },
  lapiz: { fontSize: 12, color: P.sub },
  por: { fontFamily: font.regular, fontSize: 12, color: P.sub, marginTop: 2 },
  lado: { alignItems: 'flex-end', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: P.chipBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillTxt: { fontFamily: font.semibold, fontSize: 12, color: P.ink },
  pillNeutra: { borderWidth: 1, borderColor: P.linea },
  pillNeutraTxt: { fontFamily: font.medium, fontSize: 11, color: P.sub },
  borra: { fontFamily: font.semibold, fontSize: 14, color: P.sub, paddingHorizontal: 6, paddingVertical: 2 },
  vacio: { fontFamily: font.regular, fontSize: 13, color: P.sub, paddingVertical: 14, textAlign: 'center' },
  addMas: { fontFamily: font.semibold, fontSize: 14, color: P.naranja, marginTop: 14 },
  editFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editInput: { flex: 1, borderWidth: 1, borderColor: P.naranja, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontFamily: font.medium, fontSize: 14, color: P.ink, backgroundColor: P.blanco },
  editOk: { fontFamily: font.bold, fontSize: 16, color: P.naranja, paddingHorizontal: 4 },
  boton: { marginTop: 22, backgroundColor: P.naranja, borderRadius: 999, alignItems: 'center', paddingVertical: 14 },
  botonTxt: { fontFamily: font.bold, fontSize: 15, color: P.blanco },
});
