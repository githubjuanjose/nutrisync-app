/**
 * Add Ingredients (r19-c, diseño Lucía) — añadir alimentos a un meal ya
 * analizado, buscando en la HOJA DE ALINEACIÓN (alignment_food_tags, 408
 * alimentos de Constanza/Pilar).
 *
 * Por qué esa tabla y no un buscador libre:
 *   · Sus nombres son los CANÓNICOS del motor → todo lo añadido aquí casa
 *     seguro y sale con su tier (la visión, en cambio, puede no casar).
 *   · Es de solo-lectura para usuarias autenticadas (RLS ya lo permite).
 *   · 408 filas: cabe entera en memoria, el buscador es local e instantáneo.
 *
 * Escribe en meal_capture_items (la RLS «items de mis meals» exige que el
 * meal sea suyo). Al volver, MealPhotoScreen recarga items + alineación solo
 * (useFocusEffect): esta pantalla no necesita avisar a nadie.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { font } from '../../theme';
import { useT } from '../../i18n';
import { supabase } from '../../lib/supabase';

const P = {
  ink: '#3D1E25', sub: '#7D6469', naranja: '#FF5D00', naranjaSoft: '#FFF1E6',
  rosaTop: '#F9DCD7', crema: '#FFFBF9', linea: '#F3E6E1', blanco: '#FFFFFF',
};

type Alimento = { food_id: string; food_name: string; category: string };
const QUICK = ['spinach', 'avocado', 'salmon', 'blueberr', 'chia'];

export default function AddIngredientsScreen({ navigation, route }: any) {
  const t = useT();
  const mealId: string | undefined = route?.params?.mealId;

  const [estado, setEstado] = useState<'cargando' | 'lista' | 'error' | 'guardando'>('cargando');
  const [todos, setTodos] = useState<Alimento[]>([]);
  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState<Record<string, string>>({});   // food_id → food_name

  const carga = () => {
    setEstado('cargando');
    supabase.from('alignment_food_tags')
      .select('food_id, food_name, category')
      .order('category').order('food_name')
      .then((r) => {
        if (r.error || !r.data) { setEstado('error'); return; }
        setTodos(r.data as Alimento[]);
        setEstado('lista');
      }, () => setEstado('error'));
  };
  useEffect(carga, []);

  const rapidos = useMemo(
    () => QUICK
      .map((q) => todos.find((a) => a.food_name.toLowerCase().includes(q)))
      .filter(Boolean) as Alimento[],
    [todos],
  );

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? todos.filter((a) => a.food_name.toLowerCase().includes(q)) : todos;
  }, [todos, busca]);

  const porCategoria = useMemo(() => {
    const m = new Map<string, Alimento[]>();
    for (const a of visibles) {
      if (!m.has(a.category)) m.set(a.category, []);
      m.get(a.category)!.push(a);
    }
    return Array.from(m.entries());
  }, [visibles]);

  const nSel = Object.keys(sel).length;
  const alterna = (a: Alimento) => setSel((p) => {
    const n = { ...p };
    if (n[a.food_id]) delete n[a.food_id]; else n[a.food_id] = a.food_name;
    return n;
  });

  const confirmar = async () => {
    if (!mealId || nSel === 0) return;
    setEstado('guardando');
    const filas = Object.values(sel).map((nombre) => ({
      meal_id: mealId,
      detected_name: nombre,               // canónico de la hoja → casa seguro
      portion_description: t('mob.foto.addManualPorcion', 'added by you'),
    }));
    const ins = await supabase.from('meal_capture_items').insert(filas);
    if (ins.error) { setEstado('error'); return; }
    navigation.goBack();                    // MealPhoto recarga solo (focus)
  };

  return (
    <View style={s.fill}>
      <LinearGradient colors={[P.rosaTop, P.crema]} locations={[0, 0.55]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={s.backCirc}>
            <Text style={s.back}>‹</Text>
          </Pressable>
          <Text style={s.title}>{t('mob.foto.addTit', 'Add Ingredients')}</Text>
          <View style={{ width: 34 }} />
        </View>

        {estado === 'cargando' && (
          <View style={s.centro}><ActivityIndicator size="large" color={P.naranja} /></View>
        )}

        {estado === 'error' && (
          <View style={s.centro}>
            <View style={s.errCirculo}><Text style={s.errIco}>⚠</Text></View>
            <Text style={s.errTit}>{t('mob.foto.errTit', 'That didn’t work')}</Text>
            <Text style={s.errTxt}>
              {t('mob.foto.errCargaIng', "We couldn't load the ingredients. Check your connection and try again.")}
            </Text>
            <Pressable style={[s.boton, s.botonPri]} onPress={carga}>
              <Text style={s.botonPriTxt}>{t('mob.foto.reintentar', 'Try again')} ↻</Text>
            </Pressable>
          </View>
        )}

        {(estado === 'lista' || estado === 'guardando') && (
          <>
            <View style={s.buscaCaja}>
              <Text style={s.buscaLupa}>🔍</Text>
              <TextInput
                style={s.buscaInput}
                placeholder={t('mob.foto.buscar', 'Search ingredients…')}
                placeholderTextColor={P.sub}
                value={busca} onChangeText={setBusca}
                autoCorrect={false} autoCapitalize="none"
              />
            </View>

            <ScrollView contentContainerStyle={s.cuerpo} keyboardShouldPersistTaps="handled">
              {!busca && rapidos.length > 0 && (
                <>
                  <Text style={s.quickTit}>{t('mob.foto.quickAdd', 'Quick add')}</Text>
                  <View style={s.quickFila}>
                    {rapidos.map((a) => (
                      <Pressable key={a.food_id} onPress={() => alterna(a)}
                        style={[s.quickChip, sel[a.food_id] && s.quickChipOn]}>
                        <Text style={[s.quickChipTxt, sel[a.food_id] && s.quickChipTxtOn]}>
                          {a.food_name.split(' (')[0]} {sel[a.food_id] ? '✓' : '＋'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              <View style={s.card}>
                {porCategoria.map(([cat, lista]) => (
                  <View key={cat}>
                    <Text style={s.catTit}>{cat.toUpperCase()}</Text>
                    {lista.map((a) => (
                      <Pressable key={a.food_id} style={s.fila} onPress={() => alterna(a)}>
                        <Text style={s.filaNom} numberOfLines={1}>{a.food_name}</Text>
                        <View style={[s.mas, sel[a.food_id] && s.masOn]}>
                          <Text style={[s.masTxt, sel[a.food_id] && s.masTxtOn]}>
                            {sel[a.food_id] ? '✓' : '＋'}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ))}
                {porCategoria.length === 0 && (
                  <Text style={s.vacio}>{t('mob.foto.sinResultados', 'Nothing matches that search.')}</Text>
                )}
              </View>
            </ScrollView>

            <View style={s.pie}>
              <View style={s.pieFila}>
                <Text style={s.pieTxt}>{nSel} {t('mob.foto.seleccionados', 'selected')}</Text>
                {nSel > 0 && (
                  <Pressable onPress={() => setSel({})} hitSlop={8}>
                    <Text style={s.limpiar}>{t('mob.foto.limpiar', 'Clear all')}</Text>
                  </Pressable>
                )}
              </View>
              <Pressable
                style={[s.boton, s.botonPri, (nSel === 0 || estado === 'guardando') && s.botonOff]}
                disabled={nSel === 0 || estado === 'guardando'}
                onPress={confirmar}>
                <Text style={s.botonPriTxt}>
                  {estado === 'guardando' ? '…' : t('mob.foto.confirmarIng', 'Confirm ingredients')}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 10,
  },
  backCirc: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: P.blanco,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: P.ink, shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  back: { fontSize: 24, color: P.ink, lineHeight: 26, marginTop: -2 },
  title: { fontFamily: font.semibold, fontSize: 17, color: P.ink },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },

  buscaCaja: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: P.blanco, borderRadius: 100, borderWidth: 1, borderColor: P.linea,
    paddingHorizontal: 16, marginHorizontal: 20, marginBottom: 12, height: 46,
  },
  buscaLupa: { fontSize: 14 },
  buscaInput: { flex: 1, fontFamily: font.regular, fontSize: 14, color: P.ink },

  cuerpo: { paddingHorizontal: 20, paddingBottom: 16 },
  quickTit: {
    fontFamily: font.semibold, fontSize: 11.5, letterSpacing: 0.6,
    color: P.sub, marginBottom: 8,
  },
  quickFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  quickChip: {
    backgroundColor: P.blanco, borderRadius: 100, borderWidth: 1, borderColor: P.linea,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  quickChipOn: { backgroundColor: P.naranja, borderColor: P.naranja },
  quickChipTxt: { fontFamily: font.medium, fontSize: 13, color: P.ink },
  quickChipTxtOn: { color: P.blanco },

  card: {
    backgroundColor: P.blanco, borderRadius: 20, paddingHorizontal: 16, paddingBottom: 8,
    shadowColor: P.ink, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  catTit: {
    fontFamily: font.bold, fontSize: 12, letterSpacing: 0.5, color: P.naranja,
    marginTop: 16, marginBottom: 4,
  },
  fila: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F8F1EE',
  },
  filaNom: { flex: 1, fontFamily: font.medium, fontSize: 14, color: P.ink, paddingRight: 10 },
  mas: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: P.naranjaSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  masOn: { backgroundColor: P.naranja },
  masTxt: { fontFamily: font.bold, fontSize: 15, color: P.naranja },
  masTxtOn: { color: P.blanco },
  vacio: { fontFamily: font.regular, fontSize: 13.5, color: P.sub, paddingVertical: 18, textAlign: 'center' },

  pie: {
    borderTopWidth: 1, borderTopColor: P.linea, backgroundColor: 'rgba(255,251,249,0.96)',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6,
  },
  pieFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pieTxt: { fontFamily: font.regular, fontSize: 13, color: P.sub },
  limpiar: { fontFamily: font.bold, fontSize: 13.5, color: P.naranja },

  boton: { borderRadius: 100, paddingVertical: 15, alignItems: 'center' },
  botonPri: {
    backgroundColor: P.naranja,
    shadowColor: P.naranja, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  botonOff: { opacity: 0.45 },
  botonPriTxt: { fontFamily: font.bold, fontSize: 15.5, color: P.blanco },

  errCirculo: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: P.naranja,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  errIco: { fontSize: 30, color: P.blanco },
  errTit: { fontFamily: font.bold, fontSize: 21, color: P.ink, marginBottom: 6 },
  errTxt: {
    fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: P.sub,
    textAlign: 'center', marginBottom: 14,
  },
});
