/**
 * Epic P · «Foto de comida» — piel v3 (r19-c, 18-ago): las pantallas de Lucía.
 *
 * EL CAMINO COMPLETO, EN UNA PANTALLA
 *   método (Scan / Manual) → cámara del sistema → normalizar 1024px sin EXIF
 *   → subir a meal-images → fila en meal_captures (queued) → Edge analyse-meal
 *   → Scan Results (tiers por item + badge global) → Meal Logged (anillo).
 *   «Add more ingredients» abre AddIngredients (hoja de 408, nombres canónicos).
 *
 * LO QUE ESTA PIEL NO CAMBIA (a propósito):
 *   · Toda la lógica de captura/subida/análisis es LA MISMA que la 0.22.1
 *     verificada en dispositivo — aquí solo cambia el pintado (r19-c).
 *   · La cámara es la del SISTEMA: la pantalla de cámara custom del diseño
 *     necesita expo-camera, que no está en el binario b8 → item 0.23 (r17:
 *     una dependencia en package.json NO es una dependencia en el binario).
 *   · La tarjeta de privacidad se queda aunque el diseño no la traiga:
 *     línea roja de Pilar/RGPD. Restilada, no retirada.
 *   · Regla del tono (pendiente del sí de Pilar): la frase de fase SOLO en
 *     positivo — vive en lib/alineacion.ts, no aquí.
 *
 * Toda la lógica probable vive en lib/foto.ts (20 unitarios) y
 * lib/alineacion.ts (11). Aquí queda el IO y el pintado.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Image, ScrollView,
  ActivityIndicator, Platform, Linking, Animated, Easing, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { font } from '../../theme';
import { useT } from '../../i18n';
import { useSession } from '../../state/SessionProvider';
import { supabase } from '../../lib/supabase';
import { notify } from '../../lib/notify';
import { recomputeCAS } from '../../lib/daily';
import { localDayISO } from '../../lib/localDay';
import {
  rutaFoto, tipoPorHora, redimension, borradorUtil, nivelConfianza,
  gramosTotales, motivoFallo, pesoAceptable, eligeTipo, bytesDesdeBase64,
  resincronizaDescripcion, CALIDAD_JPEG, TipoComida, ItemIA,
} from '../../lib/foto';
import { cargaGlosario, decoraNombre } from '../../lib/glosario';
import {
  Alineacion, parseAlineacion, tierDeItem, claveDeTier,
  fraseDeFasePermitida, faseDeSegmento, Tier,
} from '../../lib/alineacion';

type Fase = 'inicio' | 'previa' | 'trabajando' | 'borrador' | 'guardada' | 'fallo';

/* Paleta NutriLog v3 — muestreada de los SVG de Lucía (18-ago). Local a esta
   piel: el tema global no se toca hasta que el resto de la app la adopte. */
const P = {
  ink: '#3D1E25', sub: '#7D6469', naranja: '#FF5D00', naranjaSoft: '#FFF1E6',
  rosaTop: '#F9DCD7', crema: '#FFFBF9', linea: '#F3E6E1', chipBg: '#F5F0F2',
  verde: '#22C55E', ambar: '#F59E0B', rojo: '#D32F2F', rojoBg: '#FFEBEE',
  blanco: '#FFFFFF',
};
const TIER_DOT: Record<Tier, string> = {
  Excellent: P.verde, Great: '#4CAF50', Good: P.ambar, Fair: '#9E9E9E',
};
const RING_FRAC: Record<Tier, number> = {
  Excellent: 0.95, Great: 0.75, Good: 0.5, Fair: 0.3,
};

const TIPOS: { clave: TipoComida; icono: string; porDefecto: string }[] = [
  { clave: 'breakfast', icono: '🌅', porDefecto: 'Breakfast' },
  { clave: 'lunch', icono: '🍽', porDefecto: 'Lunch' },
  { clave: 'dinner', icono: '🌙', porDefecto: 'Dinner' },
  { clave: 'snack', icono: '🍎', porDefecto: 'Snack' },
  { clave: 'drink', icono: '🥤', porDefecto: 'Drink' },
];

/** Carga perezosa de los módulos nativos. Si no están en el binario NO se
 *  silencia: se devuelve null y la pantalla explica por qué no puede seguir. */
function moduloNativo(nombre: 'expo-image-picker' | 'expo-image-manipulator'): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return nombre === 'expo-image-picker' ? require('expo-image-picker') : require('expo-image-manipulator');
  } catch {
    return null;
  }
}

/** Anillo del Cycle Sync Score (react-native-svg, presente en el binario). */
function Anillo({ frac }: { frac: number }) {
  const R = 52, C = 2 * Math.PI * R;
  return (
    <Svg width={132} height={132} viewBox="0 0 132 132">
      <Circle cx={66} cy={66} r={R} stroke={P.naranjaSoft} strokeWidth={13} fill="none" />
      <Circle
        cx={66} cy={66} r={R} stroke={P.naranja} strokeWidth={13} fill="none"
        strokeLinecap="round" strokeDasharray={`${C * frac} ${C}`}
        transform="rotate(-90 66 66)"
      />
    </Svg>
  );
}

/** Línea de escaneo animada sobre la foto (pantalla «Analyzing»). */
function LineaEscaneo() {
  const y = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(y, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [y]);
  return (
    <Animated.View style={[s.scanLinea, {
      transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [10, 210] }) }],
    }]} />
  );
}

export default function MealPhotoScreen({ navigation, route }: any) {
  const t = useT();
  const { userId } = useSession();
  // L5 (UST-02 v2): desde el Today de AYER se registra con fecha de ayer.
  const fechaLog: string | undefined = route?.params?.fecha;

  const [fase, setFase] = useState<Fase>('inicio');
  const [uri, setUri] = useState<string | null>(null);
  const [paso, setPaso] = useState<string>('');
  const [pasoIdx, setPasoIdx] = useState<number>(0);           // checklist de análisis
  const [mealId, setMealId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemIA[]>([]);
  const [nombre, setNombre] = useState<string>('');
  const [confianza, setConfianza] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [alin, setAlin] = useState<Alineacion>(() => parseAlineacion(null));
  const [errClave, setErrClave] = useState<string>('');
  const [gramos, setGramos] = useState<Record<number, number>>({});
  const [segBanner, setSegBanner] = useState<string | null>(null); // fase para el banner del método

  // La hora es la SUYA, no la de Greenwich (NS-0010).
  const [tipo, setTipo] = useState<TipoComida>(() => tipoPorHora(new Date().getHours()));
  // F1 (UST-04): si ELLA tocó los chips, su elección manda — el guess no pisa.
  const tipoTocado = useRef(false);
  const eligeManual = (x: TipoComida) => { tipoTocado.current = true; setTipo(x); };
  // F7: glosario ES para decorar nombres — carga perezosa, jamás rompe.
  const [, setGlosarioListo] = useState(false);
  useEffect(() => { cargaGlosario().then(() => setGlosarioListo(true), () => {}); }, []);
  // F6: edición inline de un item (corregir el «vino» que era Coca-Cola).
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editTxt, setEditTxt] = useState('');

  const totalGramos = useMemo(
    () => gramosTotales(items.map((it, i) => ({ ...it, estimated_grams: gramos[i] ?? it.estimated_grams }))),
    [items, gramos],
  );

  // Fase del ciclo para el banner del método — silencio si no hay (r12-b4).
  useEffect(() => {
    if (!userId) return;
    supabase.rpc('ns_segmento_actual', { p_user: userId })
      .then((r) => setSegBanner(typeof r.data === 'string' ? r.data : null),
            () => { /* sin fase no hay banner, y ya */ });
  }, [userId]);

  // Al volver de AddIngredients: recargar items + alineación del meal abierto.
  const recarga = useCallback(async () => {
    if (!mealId) return;
    const filas = await supabase.from('meal_capture_items')
      .select('id, detected_name, portion_description, estimated_grams, confidence')
      .eq('meal_id', mealId).order('created_at');
    if (!filas.error) {
      setItems((filas.data ?? []).map((f: any) => ({
        id: f.id,
        display_name: f.detected_name,
        portion_description: f.portion_description,
        estimated_grams: typeof f.estimated_grams === 'number' ? f.estimated_grams : undefined,
        confidence: typeof f.confidence === 'number' ? f.confidence : undefined,
      })));
      setGramos({});
    }
    supabase.rpc('meal_alignment', { p_meal_id: mealId })
      .then((r) => setAlin(parseAlineacion(r.data)), () => {});
  }, [mealId]);

  useFocusEffect(useCallback(() => {
    if (fase === 'borrador' && mealId) recarga();
  }, [fase, mealId, recarga]));

  // ── 1 · Coger la foto ─────────────────────────────────────────────────────
  const coge = useCallback(async (fuente: 'camara' | 'galeria') => {
    const IP = moduloNativo('expo-image-picker');
    if (!IP) {
      setError(t('mob.foto.errModulo',
        'This needs the latest app version. Update from the store and try again.'));
      setFase('fallo');
      return;
    }
    try {
      const permiso = fuente === 'camara'
        ? await IP.requestCameraPermissionsAsync()
        : await IP.requestMediaLibraryPermissionsAsync();
      if (!permiso?.granted) {
        // Permiso denegado NO es un error nuestro: se explica y se ofrece la salida.
        notify(
          t('mob.foto.permTit', 'Permission needed'),
          fuente === 'camara'
            ? t('mob.foto.permCam', 'NutriSync needs the camera to photograph your meal.')
            : t('mob.foto.permGal', 'NutriSync needs access to your photos to pick a meal.'),
        );
        if (permiso?.canAskAgain === false) Linking.openSettings?.();
        return;
      }
      const r = fuente === 'camara'
        ? await IP.launchCameraAsync({ quality: 0.9, exif: false })
        : await IP.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, exif: false });
      if (r?.canceled || !r?.assets?.[0]?.uri) return;      // cancelar es una respuesta válida
      setUri(r.assets[0].uri);
      setError('');
      setFase('previa');
    } catch (e: any) {
      setError(e?.message ?? t('mob.foto.errCamara', 'The camera could not be opened.'));
      setFase('fallo');
    }
  }, [t]);

  // ── 2 · Normalizar · subir · analizar ─────────────────────────────────────
  const analiza = useCallback(async () => {
    if (!uri || !userId) return;
    setFase('trabajando');
    setError('');
    try {
      // 2a · 1024 px + recompresión = adiós EXIF. Sin el módulo no se sube nada:
      //      preferimos no analizar a mandar una foto con GPS dentro.
      setPaso(t('mob.foto.pasoPrep', 'Preparing the photo…')); setPasoIdx(0);
      const IM = moduloNativo('expo-image-manipulator');
      if (!IM) throw new Error(t('mob.foto.errModulo',
        'This needs the latest app version. Update from the store and try again.'));

      const medida = await new Promise<{ w: number; h: number }>((res) =>
        Image.getSize(uri, (w, h) => res({ w, h }), () => res({ w: 0, h: 0 })));
      const escala = redimension(medida.w, medida.h);
      const acciones = escala ? [{ resize: escala }] : [];
      // r18: base64 directo del manipulador. NUNCA fetch(file://) + blob aquí:
      // en Android ese fetch lanza «Network request failed» y en iOS subía un
      // Blob que el SDK serializa a 0 bytes (el 400 de OpenAI del estreno).
      const listo = await IM.manipulateAsync(uri, acciones, {
        compress: CALIDAD_JPEG, format: IM.SaveFormat.JPEG, base64: true,
      });

      // 2b · Subida al bucket privado, en SU carpeta (la RLS lo exige)
      setPaso(t('mob.foto.pasoSube', 'Saving it to your account…')); setPasoIdx(1);
      const bytes = bytesDesdeBase64(listo.base64);
      if (bytes.byteLength === 0) throw new Error('empty_image');   // jamás subir vacío
      if (!pesoAceptable(bytes.byteLength)) throw new Error('too_large');
      const ruta = rutaFoto(userId, Date.now(), 'jpg');
      const up = await supabase.storage.from('meal-images')
        .upload(ruta, bytes.buffer as ArrayBuffer, { contentType: 'image/jpeg', upsert: false });
      if (up.error) throw up.error;

      // 2c · La fila. Se crea DESPUÉS de la subida: así no quedan comidas
      //      fantasma sin imagen si la red se cae a mitad.
      const ins = await supabase.from('meal_captures').insert({
        user_id: userId, meal_type: tipo, origen: 'foto',
        image_path: ruta, status: 'queued',
      }).select('id').single();
      if (ins.error) throw ins.error;
      const id = ins.data.id as string;
      setMealId(id);

      // 2d · El cerebro (Edge). Va con su JWT: el gateway lo exige (r12-b7).
      setPaso(t('mob.foto.pasoIA', 'Reading your plate…')); setPasoIdx(2);
      const inv = await supabase.functions.invoke('analyse-meal', { body: { mealId: id } });
      if (inv.error) {
        // El `message` de invoke es siempre el mismo genérico («non-2xx»): el
        // motivo de verdad viaja en el CUERPO de la respuesta. Sin leerlo, un
        // «falta OPENAI_API_KEY» llega disfrazado de «algo salió mal» y se
        // diagnostica a ciegas. Misma regla que nsFail en el hub.
        let detalle = '';
        try { detalle = ((await (inv.error as any)?.context?.json?.()) ?? {}).error ?? ''; } catch { /* cuerpo no-JSON */ }
        throw new Error(detalle || inv.error.message || 'analyse-meal');
      }

      // 2e · La verdad se lee de la BASE, no de la respuesta: si la Edge
      //      escribió y luego falló al responder, el borrador existe igual.
      const [fila, filas] = await Promise.all([
        supabase.from('meal_captures')
          .select('status, ai_confidence, failure_reason, raw_ai_analysis').eq('id', id).single(),
        supabase.from('meal_capture_items')
          .select('id, detected_name, portion_description, estimated_grams, confidence')
          .eq('meal_id', id).order('created_at'),
      ]);
      if (fila.error) throw fila.error;

      const bruto: any = fila.data?.raw_ai_analysis ?? null;
      const detectados: ItemIA[] = (filas.data ?? []).map((f: any) => ({
        id: f.id,
        display_name: f.detected_name,
        portion_description: f.portion_description,
        estimated_grams: typeof f.estimated_grams === 'number' ? f.estimated_grams : undefined,
        confidence: typeof f.confidence === 'number' ? f.confidence : undefined,
      }));

      if (fila.data?.status === 'failed' || !borradorUtil({ ...bruto, items: detectados })) {
        const m = motivoFallo(fila.data?.failure_reason ?? (bruto?.is_food === false ? 'not_food' : ''));
        setError(t(m.clave, m.texto));
        setErrClave(m.clave);
        setFase('fallo');
        return;
      }

      setItems(detectados);
      setGramos({});
      setNombre(String(bruto?.meal_name ?? ''));
      setConfianza(typeof fila.data?.ai_confidence === 'number' ? fila.data.ai_confidence : null);
      // F1 (UST-04, lunch de Pilar bajo Dinner): el guess SOLO rellena si ella
      // no tocó los chips. Su elección manda siempre.
      setTipo((prev) => eligeTipo(tipoTocado.current, bruto?.meal_type_guess, prev));
      setFase('borrador');

      // r19: alineación por fase — en paralelo y sin bloquear: si el RPC
      // falla o está apagado en la base, la pantalla queda igual que antes
      // (sin chips), jamás rota. La forma la valida parseAlineacion.
      supabase.rpc('meal_alignment', { p_meal_id: id })
        .then((r) => setAlin(parseAlineacion(r.data)),
              () => { /* silencio: sin alineación no hay chips, y ya */ });
    } catch (e: any) {
      const m = motivoFallo(e?.message ?? '');
      setError(e?.message && !/^[a-z_]+$/.test(e.message) ? e.message : t(m.clave, m.texto));
      setErrClave(m.clave);
      setFase('fallo');
    } finally {
      setPaso('');
    }
  }, [uri, userId, tipo, t]);

  // ── 3 · Confirmar: lo que ella corrige es el dataset que nos hace mejores ──
  const confirma = useCallback(async () => {
    if (!mealId) return;
    setFase('trabajando');
    setPaso(t('mob.foto.pasoGuarda', 'Saving…'));
    try {
      const corregidos = Object.keys(gramos).length > 0;
      if (corregidos) {
        // Cada corrección se guarda con el ANTES y el DESPUÉS: sin el antes,
        // el dato no enseña nada a nadie.
        await supabase.from('meal_capture_edits').insert({
          meal_id: mealId, user_id: userId, edit_reason: 'gramos',
          before_value: { items: items.map((i) => i.estimated_grams ?? null) },
          after_value: { items: items.map((i, k) => gramos[k] ?? i.estimated_grams ?? null) },
        });
      }
      const upd = await supabase.from('meal_captures')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), meal_type: tipo })
        .eq('id', mealId);
      if (upd.error) throw upd.error;

      // F1 (UST-03 · Pilar, 18-ago): la foto ESCRIBE en el historial — las
      // comidas en TEXTO, sin imagen. Idempotente por capture_id (índice
      // único parcial). Si fallara, la confirmación MANDA: jamás rompe el ok.
      try {
        const ya = await supabase.from('meal_logs')
          .select('id').eq('capture_id', mealId).maybeSingle();
        if (!ya.data) {
          const nombres = items.map((i) => i.display_name).filter(Boolean).join(', ');
          const row: Record<string, any> = {
            user_id: userId, date: fechaLog ?? localDayISO(),
            description: (nombre ? nombre + ' — ' : '') + nombres,
            meal_type: tipo, origen: 'foto', capture_id: mealId,
          };
          let ins = await supabase.from('meal_logs').insert(row);
          if (ins.error && /origen|capture_id/.test(ins.error.message)) {
            // patrón R2-C: si la migración aún no corrió, entra sin el enlace
            delete row.origen; delete row.capture_id;
            ins = await supabase.from('meal_logs').insert(row);
          }
        }
        // F2/F3: FUEL y el score del día se enteran solos
        recomputeCAS(userId!).then(() => {}, () => {});
      } catch { /* el historial se recupera en la próxima confirmación */ }

      notify(t('mob.foto.guardada', 'Meal saved'), nombre || '');
      // Diseño Lucía: la confirmación ES una pantalla, no un portazo.
      setFase('guardada');
    } catch (e: any) {
      setError(e?.message ?? t('mob.foto.errGuardar', 'It could not be saved.'));
      setFase('fallo');
    } finally { setPaso(''); }
  }, [mealId, gramos, items, tipo, nombre, userId, navigation, t]);

  const reinicia = () => {
    setFase('inicio'); setUri(null); setMealId(null);
    setItems([]); setGramos({}); setError(''); setNombre(''); setConfianza(null);
    setAlin(parseAlineacion(null)); setErrClave(''); setPasoIdx(0);
    setEditIdx(null); setEditTxt(''); tipoTocado.current = false;
  };

  /* ── F6 (UST-04): el plato es SUYO — borrar el vino fantasma, corregir el
     nombre. Tras cada cambio: re-alineación + resync de meal_logs si ya se
     confirmó + recompute. La cadena entera, no solo el tramo tocado (r18-d). */
  const trasCambioDeItems = useCallback(async () => {
    if (!mealId) return;
    await recarga();
    try {
      const vivos = await supabase.from('meal_capture_items')
        .select('detected_name').eq('meal_id', mealId).order('created_at');
      const nombres = (vivos.data ?? []).map((f: any) => String(f.detected_name ?? ''));
      const log = await supabase.from('meal_logs')
        .select('id, description').eq('capture_id', mealId).maybeSingle();
      if (log.data) {
        await supabase.from('meal_logs')
          .update({ description: resincronizaDescripcion(log.data.description, nombres) })
          .eq('id', log.data.id);
        recomputeCAS(userId!).then(() => {}, () => {});
      }
    } catch { /* el resync reintenta en la próxima edición */ }
  }, [mealId, recarga, userId]);

  const borraItem = useCallback(async (it: ItemIA) => {
    if (!it.id) return;
    try {
      await supabase.from('meal_capture_items').delete().eq('id', it.id);
      await trasCambioDeItems();
    } catch { /* sin drama: la fila sigue y ella reintenta */ }
  }, [trasCambioDeItems]);

  const corrigeItem = useCallback(async (it: ItemIA, nuevo: string) => {
    const limpio = nuevo.trim();
    if (!it.id || !limpio || limpio === it.display_name) { setEditIdx(null); return; }
    try {
      // El ANTES y el DESPUÉS: la corrección enseña (mismo patrón que gramos).
      await supabase.from('meal_capture_edits').insert({
        meal_id: mealId, user_id: userId, edit_reason: 'nombre',
        before_value: { name: it.display_name ?? null },
        after_value: { name: limpio },
      }).then(() => {}, () => {});
      await supabase.from('meal_capture_items')
        .update({ detected_name: limpio }).eq('id', it.id);
      setEditIdx(null); setEditTxt('');
      await trasCambioDeItems();
    } catch { setEditIdx(null); }
  }, [mealId, userId, trasCambioDeItems]);

  // F1: cambiar el tipo TAMBIÉN después de guardar (la última puerta).
  const cambiaTipoGuardada = useCallback(async (nuevo: TipoComida) => {
    tipoTocado.current = true; setTipo(nuevo);
    if (!mealId) return;
    try {
      await supabase.from('meal_captures').update({ meal_type: nuevo }).eq('id', mealId);
      await supabase.from('meal_logs').update({ meal_type: nuevo }).eq('capture_id', mealId);
    } catch { /* el chip queda; la base se resincroniza en la próxima */ }
  }, [mealId]);

  const faseBanner = faseDeSegmento(segBanner);

  // ── Pintado ───────────────────────────────────────────────────────────────
  return (
    <View style={s.fill}>
      <LinearGradient colors={[P.rosaTop, P.crema]} locations={[0, 0.55]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={s.backCirc}>
            <Text style={s.back}>‹</Text>
          </Pressable>
          <Text style={s.title}>
            {fase === 'borrador' ? t('mob.foto.resultTit', 'Scan Results')
              : fase === 'guardada' ? ''
              : t('mob.foto.titulo', 'Log Your Meal')}
          </Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView contentContainerStyle={s.cuerpo} keyboardShouldPersistTaps="handled">
          {/* ── S1 · Método (diseño «Log Your Meal») ─────────────────────── */}
          {fase === 'inicio' && (
            <>
              <Text style={s.h1}>{t('mob.foto.metodoTit', 'How would you like to log your meal?')}</Text>
              <Text style={s.lead}>
                {t('mob.foto.metodoSub', 'Select a method below to add ingredients and calculate your cycle sync score.')}
              </Text>

              <Pressable style={s.metodoCard} onPress={() => coge('camara')}>
                <View style={s.metodoIco}><Text style={s.metodoIcoTxt}>📷</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.metodoTit}>{t('mob.foto.metodoScan', 'Scan My Food')}</Text>
                  <Text style={s.metodoSub}>
                    {t('mob.foto.metodoScanSub', "Take a photo and we'll identify ingredients instantly")}
                  </Text>
                </View>
              </Pressable>

              <Pressable style={s.metodoCard} onPress={() => navigation.navigate('MealLog', fechaLog ? { fecha: fechaLog } : undefined)}>
                <View style={s.metodoIco}><Text style={s.metodoIcoTxt}>✏️</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.metodoTit}>{t('mob.foto.metodoManual', 'Add Manually')}</Text>
                  <Text style={s.metodoSub}>
                    {t('mob.foto.metodoManualSub', 'Search and add ingredients yourself from our database')}
                  </Text>
                </View>
              </Pressable>

              <Pressable onPress={() => coge('galeria')} hitSlop={8}>
                <Text style={s.linkGaleria}>🖼  {t('mob.foto.elegir', 'Choose from gallery')}</Text>
              </Pressable>

              {faseBanner && (
                <View style={s.banner}>
                  <Text style={s.bannerIco}>✦</Text>
                  <Text style={s.bannerTxt}>
                    {t('mob.foto.bannerFase', 'Logging meals keeps your cycle sync score high during your current phase')}
                    {': '}
                    <Text style={s.bannerFase}>{t('mob.foto.fase.' + faseBanner, faseBanner)}</Text>
                  </Text>
                </View>
              )}

              <View style={s.privacidad}>
                <Text style={s.privTit}>🔒 {t('mob.foto.privTit', 'What happens to your photo')}</Text>
                <Text style={s.privTxt}>
                  {t('mob.foto.privTxt', 'It is stored in your private account. Only the image is sent for analysis — never your name, your cycle or your location, and the photo is stripped of its location data first.')}
                </Text>
              </View>
            </>
          )}

          {/* ── Previa: foto hecha, tipo de comida, analizar ─────────────── */}
          {fase === 'previa' && uri && (
            <>
              <Image source={{ uri }} style={s.foto} resizeMode="cover" />
              <Text style={s.seccion}>{t('mob.foto.queEs', 'Which meal is it?')}</Text>
              <View style={s.chips}>
                {TIPOS.map((x) => (
                  <Pressable key={x.clave} onPress={() => eligeManual(x.clave)}
                    style={[s.chip, tipo === x.clave && s.chipOn]}>
                    <Text style={[s.chipTxt, tipo === x.clave && s.chipTxtOn]}>
                      {x.icono} {t('mob.foto.tipo.' + x.clave, x.porDefecto)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={[s.boton, s.botonPri]} onPress={analiza}>
                <Text style={s.botonPriTxt}>✨  {t('mob.foto.analizar', 'Analyse this meal')}</Text>
              </Pressable>
              <Pressable style={[s.boton, s.botonSec]} onPress={reinicia}>
                <Text style={s.botonSecTxt}>{t('mob.foto.otra', 'Take another one')}</Text>
              </Pressable>
            </>
          )}

          {/* ── S3 · Analizando (foto + línea + checklist) ───────────────── */}
          {fase === 'trabajando' && (
            <View style={s.centro}>
              {uri ? (
                <View style={s.scanMarco}>
                  <Image source={{ uri }} style={s.scanFoto} resizeMode="cover" />
                  <LineaEscaneo />
                </View>
              ) : (
                <ActivityIndicator size="large" color={P.naranja} />
              )}
              <View style={s.progreso}>
                <View style={[s.progresoLleno, { width: `${[30, 62, 88][pasoIdx] ?? 30}%` }]} />
              </View>
              <Text style={s.analizandoTit}>{t('mob.foto.analizandoTit', 'Analyzing your meal…')}</Text>
              <Text style={s.analizandoSub}>
                {t('mob.foto.analizandoSub', 'Identifying ingredients and calculating nutritional load')}
              </Text>
              <View style={s.checklist}>
                {[t('mob.foto.pasoPrep', 'Preparing the photo…'),
                  t('mob.foto.pasoSube', 'Saving it to your account…'),
                  t('mob.foto.pasoIA', 'Reading your plate…')].map((etq, i) => (
                  <View key={i} style={s.checkFila}>
                    <Text style={[s.checkIco, { color: i < pasoIdx ? P.verde : i === pasoIdx ? P.naranja : P.linea }]}>
                      {i < pasoIdx ? '✓' : '●'}
                    </Text>
                    <Text style={[s.checkTxt, i > pasoIdx && { color: P.sub, opacity: 0.55 }]}>{etq}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── S4 · Scan Results ────────────────────────────────────────── */}
          {fase === 'borrador' && (
            <>
              {uri && <Image source={{ uri }} style={s.foto} resizeMode="cover" />}
              {!!nombre && <Text style={s.h1}>{nombre}</Text>}

              {alin.activo && alin.overall && (
                <View style={s.matchPill}>
                  <Text style={s.matchPillTxt}>✦ {t(claveDeTier(alin.overall), alin.overall)}</Text>
                </View>
              )}
              {nivelConfianza(confianza) === 'baja' && (
                <Text style={s.confBaja}>{t('mob.foto.conf.baja', 'Low — please check')}</Text>
              )}

              {/* F1: el tipo también se corrige AQUÍ, con el plato delante. */}
              <View style={s.chips}>
                {TIPOS.map((x) => (
                  <Pressable key={x.clave} onPress={() => eligeManual(x.clave)}
                    style={[s.chip, tipo === x.clave && s.chipOn]}>
                    <Text style={[s.chipTxt, tipo === x.clave && s.chipTxtOn]}>
                      {x.icono} {t('mob.foto.tipo.' + x.clave, x.porDefecto)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={s.filaSeccion}>
                <Text style={s.seccion}>{t('mob.foto.alinSeccion', 'Ingredient Alignment Score')}</Text>
              </View>
              {mealId && (
                <Pressable onPress={() => navigation.navigate('AddIngredients', { mealId })} hitSlop={8}>
                  <Text style={s.addMas}>＋ {t('mob.foto.addMas', 'Add more ingredients')}</Text>
                </Pressable>
              )}

              <View style={s.itemsCard}>
                {items.map((it, i) => {
                  const g = gramos[i] ?? it.estimated_grams ?? 0;
                  const tr = tierDeItem(alin, it.display_name ?? '');
                  return (
                    <View key={i} style={[s.itemFila, i > 0 && s.itemFilaBorde]}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        {editIdx === i ? (
                          <View style={s.editFila}>
                            <TextInput
                              value={editTxt} onChangeText={setEditTxt} autoFocus
                              style={s.editInput} returnKeyType="done"
                              onSubmitEditing={() => corrigeItem(it, editTxt)}
                            />
                            <Pressable hitSlop={8} onPress={() => corrigeItem(it, editTxt)}>
                              <Text style={s.editOk}>✓</Text>
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable onPress={() => { setEditIdx(i); setEditTxt(it.display_name ?? ''); }} hitSlop={6}>
                            <Text style={s.itemNom}>
                              {decoraNombre(it.display_name)}
                              <Text style={s.editLapiz}>  ✎</Text>
                            </Text>
                          </Pressable>
                        )}
                        {!!it.portion_description && (
                          <Text style={s.itemPor}>{it.portion_description}</Text>
                        )}
                        <View style={s.pasos}>
                          <Pressable hitSlop={10} onPress={() =>
                            setGramos((p) => ({ ...p, [i]: Math.max(0, Math.round(g - 10)) }))}>
                            <Text style={s.pasoBtn}>−</Text>
                          </Pressable>
                          <Text style={s.gramos}>{Math.round(g)} g</Text>
                          <Pressable hitSlop={10} onPress={() =>
                            setGramos((p) => ({ ...p, [i]: Math.round(g + 10) }))}>
                            <Text style={s.pasoBtn}>＋</Text>
                          </Pressable>
                        </View>
                      </View>
                      <View style={s.itemLado}>
                        {tr ? (
                          <View style={s.tierPill}>
                            <View style={[s.tierDot, { backgroundColor: TIER_DOT[tr] }]} />
                            <Text style={s.tierPillTxt}>{t(claveDeTier(tr), tr)}</Text>
                          </View>
                        ) : alin.activo ? (
                          /* F4: el silencio del matcher, dicho en voz alta */
                          <View style={[s.tierPill, s.tierPillNeutra]}>
                            <Text style={s.tierPillNeutraTxt}>{t('mob.foto.sinScore', 'No score yet')}</Text>
                          </View>
                        ) : null}
                        {!!it.id && (
                          <Pressable hitSlop={10} onPress={() => borraItem(it)}>
                            <Text style={s.borraItem}>✕</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              <Text style={s.total}>{t('mob.foto.total', 'Total')}: {Math.round(totalGramos)} g</Text>
              {/* P1 identifica; los macros llegan en P2 desde canonical_foods.
                  Se dice, no se disimula con un cero. */}
              <Text style={s.nota}>{t('mob.foto.macrosLuego',
                'Calories and macros arrive in the next update — for now your meal is saved with what it contains.')}</Text>

              {alin.activo && alin.overall && fraseDeFasePermitida(alin.overall) && faseDeSegmento(alin.segment) && (
                <View style={s.banner}>
                  <Text style={s.bannerIco}>✦</Text>
                  <Text style={s.bannerTxt}>
                    {t('mob.foto.faseOk', 'A good companion for your current phase')}
                    {' · '}
                    <Text style={s.bannerFase}>
                      {t('mob.foto.fase.' + faseDeSegmento(alin.segment), String(faseDeSegmento(alin.segment)))}
                    </Text>
                  </Text>
                </View>
              )}

              <Pressable style={[s.boton, s.botonPri]} onPress={confirma}>
                <Text style={s.botonPriTxt}>✓  {t('mob.foto.confirmar', 'Looks right, save it')}</Text>
              </Pressable>
              <Pressable style={[s.boton, s.botonSec]} onPress={reinicia}>
                <Text style={s.botonSecTxt}>{t('mob.foto.otra', 'Take another one')}</Text>
              </Pressable>
            </>
          )}

          {/* ── S5 · Meal Logged (anillo Cycle Sync) ─────────────────────── */}
          {fase === 'guardada' && (
            <View style={s.centro}>
              <View style={s.okCirculo}><Text style={s.okCheck}>✓</Text></View>
              <Text style={s.logradaTit}>{t('mob.foto.logradaTit', 'Meal logged!')}</Text>
              <Text style={s.logradaSub}>
                {items.length}{' '}
                {items.length === 1
                  ? t('mob.foto.anadido', 'ingredient added')
                  : t('mob.foto.anadidos', 'ingredients added')}
                {' · '}{t('mob.foto.tipo.' + tipo, tipo)}
              </Text>

              {/* F1: última puerta — si quedó en la comida equivocada, se
                  mueve AQUÍ y la fila del historial se muda con ella. */}
              <Text style={s.cambiaTipo}>{t('mob.foto.cambiarTipo', 'Wrong meal? Move it:')}</Text>
              <View style={s.chips}>
                {TIPOS.map((x) => (
                  <Pressable key={x.clave} onPress={() => cambiaTipoGuardada(x.clave)}
                    style={[s.chip, tipo === x.clave && s.chipOn]}>
                    <Text style={[s.chipTxt, tipo === x.clave && s.chipTxtOn]}>
                      {x.icono} {t('mob.foto.tipo.' + x.clave, x.porDefecto)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Paseo Pilar 24-ago: el anillo se ESCONDÍA cuando la comida no
                  tenía media (nada casado) — el mismo silencio que matamos en
                  los items (F4), vivo en el agregado. Ahora la tarjeta siempre
                  habla: tier si lo hay, «sin score aún» si no. */}
              {alin.activo && (
                <View style={s.syncCard}>
                  <Text style={s.syncTit}>{t('mob.foto.sync', 'Cycle Sync Score')}</Text>
                  {alin.overall ? (
                  <View style={s.syncAnillo}>
                    <Anillo frac={RING_FRAC[alin.overall]} />
                    <View style={s.syncCentro}>
                      <Text style={s.syncTier}>{t(claveDeTier(alin.overall), alin.overall)}</Text>
                    </View>
                  </View>
                  ) : (
                  <View style={s.syncVacio}>
                    <Text style={s.syncVacioTit}>{t('mob.foto.sinScore', 'No score yet')}</Text>
                    <Text style={s.syncVacioTxt}>{t('mob.foto.anilloSin',
                      'None of these foods are in the alignment sheet yet — your meal still counts in your day.')}</Text>
                  </View>
                  )}
                  {/* Regla del tono: frase de fase SOLO en positivo; en Good/
                      Fair el anillo habla y la app calla. Pendiente del sí de
                      Pilar — cambiarlo vive en lib/alineacion.ts. */}
                  {fraseDeFasePermitida(alin.overall) && faseDeSegmento(alin.segment) && (
                    <View style={s.syncPie}>
                      <Text style={s.bannerIco}>✦</Text>
                      <Text style={s.bannerTxt}>
                        {t('mob.foto.faseOk', 'A good companion for your current phase')}
                        {' · '}
                        <Text style={s.bannerFase}>
                          {t('mob.foto.fase.' + faseDeSegmento(alin.segment), String(faseDeSegmento(alin.segment)))}
                        </Text>
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <Pressable style={[s.boton, s.botonPri, s.botonAncho]} onPress={() => navigation.goBack()}>
                <Text style={s.botonPriTxt}>{t('mob.foto.volver', 'Back to home')}</Text>
              </Pressable>
              <Pressable style={[s.boton, s.botonLinea, s.botonAncho]}
                onPress={() => navigation.navigate('MealHistory')}>
                <Text style={s.botonLineaTxt}>{t('mob.foto.verHistorial', 'View meal history')}</Text>
              </Pressable>
            </View>
          )}

          {/* ── Errores (patrón No-Happy de Lucía) ───────────────────────── */}
          {fase === 'fallo' && (
            <View style={s.fallo}>
              <View style={s.errCirculo}><Text style={s.errIcoTxt}>⚠</Text></View>
              <Text style={s.falloTit}>{t('mob.foto.errTit', 'That didn’t work')}</Text>
              <Text style={s.falloTxt}>{error}</Text>
              {errClave === 'mob.foto.errNoComida' && (
                <View style={s.tipsCard}>
                  <Text style={s.tipsTit}>{t('mob.foto.tipsTit', 'Tips for a better scan:')}</Text>
                  <Text style={s.tipsTxt}>☀️ {t('mob.foto.tips1', 'Avoid harsh shadows or dim environments')}</Text>
                  <Text style={s.tipsTxt}>🍽 {t('mob.foto.tips2', 'Keep each ingredient clearly visible')}</Text>
                </View>
              )}
              <Pressable style={[s.boton, s.botonPri, s.botonAncho]} onPress={reinicia}>
                <Text style={s.botonPriTxt}>{t('mob.foto.reintentar', 'Try again')}</Text>
              </Pressable>
              {/* El camino manual nunca es un callejón (diseño Lucía). */}
              {errClave === 'mob.foto.errNoComida' && (
                <Pressable style={[s.boton, s.botonLinea, s.botonAncho]}
                  onPress={() => navigation.navigate('MealLog')}>
                  <Text style={s.botonLineaTxt}>🔍 {t('mob.foto.irManual', 'Log it manually instead')}</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
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
  cuerpo: { paddingHorizontal: 20, paddingBottom: 40 },

  h1: { fontFamily: font.bold, fontSize: 26, lineHeight: 33, color: P.ink, marginBottom: 8, marginTop: 4 },
  lead: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: P.sub, marginBottom: 20 },

  /* S1 · método */
  metodoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: P.blanco, borderRadius: 20, padding: 18, marginBottom: 14,
    shadowColor: P.ink, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  metodoIco: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: P.naranjaSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  metodoIcoTxt: { fontSize: 22 },
  metodoTit: { fontFamily: font.bold, fontSize: 16.5, color: P.ink, marginBottom: 2 },
  metodoSub: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: P.sub },
  linkGaleria: {
    fontFamily: font.medium, fontSize: 13.5, color: P.naranja,
    textAlign: 'center', marginTop: 4, marginBottom: 6,
  },
  banner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#FFF7F2', borderRadius: 16, padding: 14, marginTop: 14,
    borderWidth: 1, borderColor: '#FBE3D8',
  },
  bannerIco: { color: P.naranja, fontSize: 16, lineHeight: 20 },
  bannerTxt: { flex: 1, fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: P.ink },
  bannerFase: { fontFamily: font.bold, color: P.naranja },
  privacidad: {
    marginTop: 14, backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 16, padding: 14, borderWidth: 1, borderColor: P.linea,
  },
  privTit: { fontFamily: font.semibold, fontSize: 13.5, color: P.ink, marginBottom: 5 },
  privTxt: { fontFamily: font.regular, fontSize: 12, lineHeight: 17.5, color: P.sub },

  /* previa + fotos */
  foto: { width: '100%', height: 210, borderRadius: 20, marginBottom: 16 },
  seccion: { fontFamily: font.bold, fontSize: 15.5, color: P.ink, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 100,
    backgroundColor: P.blanco, borderWidth: 1, borderColor: P.linea,
  },
  chipOn: { backgroundColor: P.naranja, borderColor: P.naranja },
  chipTxt: { fontFamily: font.medium, fontSize: 13, color: P.sub },
  chipTxtOn: { color: P.blanco },

  /* S3 · analizando */
  centro: { alignItems: 'center', paddingVertical: 26 },
  scanMarco: { width: '100%', height: 230, borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  scanFoto: { width: '100%', height: '100%' },
  scanLinea: {
    position: 'absolute', left: 0, right: 0, height: 3,
    backgroundColor: P.naranja, shadowColor: P.naranja, shadowOpacity: 0.6, shadowRadius: 6,
  },
  progreso: {
    width: '62%', height: 8, borderRadius: 4, backgroundColor: '#F1E2DC',
    overflow: 'hidden', marginBottom: 16,
  },
  progresoLleno: { height: 8, borderRadius: 4, backgroundColor: P.naranja },
  analizandoTit: { fontFamily: font.bold, fontSize: 22, color: P.ink, marginBottom: 6 },
  analizandoSub: {
    fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: P.sub,
    textAlign: 'center', marginBottom: 18,
  },
  checklist: { alignSelf: 'stretch', paddingHorizontal: 8, gap: 10 },
  checkFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkIco: { fontFamily: font.bold, fontSize: 14, width: 18, textAlign: 'center' },
  checkTxt: { fontFamily: font.regular, fontSize: 13.5, color: P.ink },
  paso: { fontFamily: font.medium, fontSize: 14, color: P.sub, marginTop: 16 },

  /* S4 · resultados */
  matchPill: {
    alignSelf: 'flex-start', borderRadius: 100, backgroundColor: P.naranja,
    paddingHorizontal: 16, paddingVertical: 8, marginBottom: 14,
    shadowColor: P.naranja, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  matchPillTxt: { fontFamily: font.bold, fontSize: 13.5, color: P.blanco },
  confBaja: { fontFamily: font.medium, fontSize: 12.5, color: P.rojo, marginBottom: 10 },
  filaSeccion: { marginTop: 2 },
  addMas: { fontFamily: font.semibold, fontSize: 13.5, color: P.naranja, marginBottom: 12 },
  itemsCard: {
    backgroundColor: P.blanco, borderRadius: 20, paddingHorizontal: 16,
    shadowColor: P.ink, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 2, marginBottom: 12,
  },
  itemFila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  itemFilaBorde: { borderTopWidth: 1, borderTopColor: '#F6EDEA' },
  itemNom: { fontFamily: font.semibold, fontSize: 15, color: P.ink },
  itemPor: { fontFamily: font.regular, fontSize: 12, color: P.sub, marginTop: 1 },
  tierPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: P.chipBg, borderRadius: 100, paddingHorizontal: 11, paddingVertical: 5,
  },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierPillTxt: { fontFamily: font.semibold, fontSize: 12, color: P.ink },
  /* F4/F6 (UST-04, 0.22.6) */
  tierPillNeutra: { backgroundColor: P.chipBg, borderWidth: 1, borderColor: P.linea },
  tierPillNeutraTxt: { fontFamily: font.medium, fontSize: 11, color: P.sub },
  itemLado: { alignItems: 'flex-end', gap: 6 },
  borraItem: { fontFamily: font.semibold, fontSize: 14, color: P.sub, paddingHorizontal: 6, paddingVertical: 2 },
  editLapiz: { fontSize: 12, color: P.sub },
  editFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editInput: {
    flex: 1, borderWidth: 1, borderColor: P.naranja, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, fontFamily: font.medium,
    fontSize: 14, color: P.ink, backgroundColor: P.blanco,
  },
  editOk: { fontFamily: font.bold, fontSize: 16, color: P.naranja, paddingHorizontal: 4 },
  cambiaTipo: { fontFamily: font.medium, fontSize: 12, color: P.sub, marginTop: 14, marginBottom: 6 },
  /* 0.22.7 · anillo honesto (paseo Pilar 24-ago) */
  syncVacio: { alignItems: 'center', paddingVertical: 18, paddingHorizontal: 12 },
  syncVacioTit: { fontFamily: font.bold, fontSize: 16, color: P.sub },
  syncVacioTxt: { fontFamily: font.regular, fontSize: 12.5, color: P.sub, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  pasos: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  pasoBtn: { fontFamily: font.semibold, fontSize: 20, color: P.naranja, width: 22, textAlign: 'center' },
  gramos: { fontFamily: font.semibold, fontSize: 13.5, color: P.ink, minWidth: 54, textAlign: 'center' },
  total: { fontFamily: font.bold, fontSize: 15, color: P.ink, marginTop: 4 },
  nota: { fontFamily: font.regular, fontSize: 12, lineHeight: 17.5, color: P.sub, marginTop: 8 },

  /* botones */
  boton: { borderRadius: 100, paddingVertical: 15, alignItems: 'center', marginTop: 12 },
  botonPri: {
    backgroundColor: P.naranja,
    shadowColor: P.naranja, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  botonPriTxt: { fontFamily: font.bold, fontSize: 15.5, color: P.blanco },
  botonSec: { backgroundColor: P.blanco, borderWidth: 1, borderColor: P.linea },
  botonSecTxt: { fontFamily: font.medium, fontSize: 14.5, color: P.ink },
  botonLinea: { backgroundColor: P.blanco, borderWidth: 1.5, borderColor: '#F7D8C8' },
  botonLineaTxt: { fontFamily: font.semibold, fontSize: 14.5, color: P.naranja },
  botonAncho: { alignSelf: 'stretch' },

  /* S5 · logged */
  okCirculo: {
    width: 78, height: 78, borderRadius: 39, backgroundColor: P.naranja,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16, marginTop: 24,
    shadowColor: P.naranja, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  okCheck: { fontFamily: font.bold, fontSize: 38, color: P.blanco },
  logradaTit: { fontFamily: font.bold, fontSize: 26, color: P.ink, marginBottom: 4 },
  logradaSub: { fontFamily: font.regular, fontSize: 13.5, color: P.sub, marginBottom: 20 },
  syncCard: {
    alignSelf: 'stretch', backgroundColor: P.blanco, borderRadius: 22, padding: 20,
    marginBottom: 18, alignItems: 'center',
    shadowColor: P.ink, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  syncTit: { alignSelf: 'flex-start', fontFamily: font.bold, fontSize: 16, color: P.ink, marginBottom: 10 },
  syncAnillo: { alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  syncCentro: { position: 'absolute', alignItems: 'center' },
  syncTier: { fontFamily: font.bold, fontSize: 15, color: P.ink },
  syncPie: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 14,
    borderTopWidth: 1, borderTopColor: '#F6EDEA', paddingTop: 14, alignSelf: 'stretch',
  },

  /* errores */
  fallo: { alignItems: 'center', paddingVertical: 36 },
  errCirculo: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: P.naranja,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: P.naranja, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  errIcoTxt: { fontSize: 30, color: P.blanco },
  falloTit: { fontFamily: font.bold, fontSize: 21, color: P.ink, marginBottom: 6 },
  falloTxt: {
    fontFamily: font.regular, fontSize: 14, lineHeight: 20,
    color: P.sub, textAlign: 'center', marginBottom: 12, paddingHorizontal: 8,
  },
  tipsCard: {
    alignSelf: 'stretch', backgroundColor: P.blanco, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: P.linea, marginBottom: 6,
  },
  tipsTit: { fontFamily: font.semibold, fontSize: 13, color: P.ink, marginBottom: 6 },
  tipsTxt: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 19, color: P.sub },
});
