/**
 * Epic P · Incremento P1 — «Foto de comida».
 *
 * EL CAMINO COMPLETO, EN UNA PANTALLA
 *   cámara/galería → normalizar a 1024 px sin EXIF → subir a meal-images
 *   → fila en meal_captures (queued) → Edge `analyse-meal` → borrador
 *   → ella corrige gramos y confirma.
 *
 * POR QUÉ ESTA PANTALLA ES NATIVA Y NO PUEDE IR POR OTA
 * Usa expo-image-picker y expo-image-manipulator, y pide permisos de cámara y
 * de fotos. Los permisos viven en el Info.plist / AndroidManifest del binario:
 * ninguna OTA los añade. Lección r17 (10-ago), que nos costó un día: una
 * dependencia en package.json NO es una dependencia en el binario.
 *
 * DE ESA MISMA LECCIÓN VIENE OTRA REGLA QUE SE VE AQUÍ ABAJO
 * El `catch {}` vacío del picker de feedback convirtió un módulo ausente en un
 * botón mudo, y eso costó días de diagnóstico. Aquí, si el módulo no está en
 * el binario, la pantalla lo DICE. Un fallo que no hace ruido es el peor.
 *
 * PRIVACIDAD (doc 39 §4 · Propuesta 32 §2 · RAT/EIPD con Audidat)
 *  · El bucket es privado y la RLS ata cada foto a su carpeta = su uid.
 *  · Al proveedor de visión viaja SOLO la imagen recomprimida: la recompresión
 *    tira el EXIF entero (GPS, modelo, hora exacta). Ni nombre, ni edad, ni
 *    ciclo, ni identificador alguno.
 *  · Se le cuenta a ella en la propia pantalla, no en una política que nadie lee.
 *
 * Toda la lógica que se puede probar vive en `lib/foto.ts` con 20 unitarios
 * (regla r11c-2). Aquí queda el IO y el pintado.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Image, ScrollView,
  ActivityIndicator, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, radius } from '../../theme';
import { useT } from '../../i18n';
import { useSession } from '../../state/SessionProvider';
import { supabase } from '../../lib/supabase';
import { notify } from '../../lib/notify';
import {
  rutaFoto, tipoPorHora, redimension, borradorUtil, nivelConfianza,
  gramosTotales, motivoFallo, pesoAceptable, tipoValido, bytesDesdeBase64,
  CALIDAD_JPEG, TipoComida, ItemIA,
} from '../../lib/foto';

type Fase = 'inicio' | 'previa' | 'trabajando' | 'borrador' | 'fallo';

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

export default function MealPhotoScreen({ navigation }: any) {
  const t = useT();
  const { userId } = useSession();

  const [fase, setFase] = useState<Fase>('inicio');
  const [uri, setUri] = useState<string | null>(null);
  const [paso, setPaso] = useState<string>('');
  const [mealId, setMealId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemIA[]>([]);
  const [nombre, setNombre] = useState<string>('');
  const [confianza, setConfianza] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [gramos, setGramos] = useState<Record<number, number>>({});

  // La hora es la SUYA, no la de Greenwich (NS-0010).
  const [tipo, setTipo] = useState<TipoComida>(() => tipoPorHora(new Date().getHours()));

  const totalGramos = useMemo(
    () => gramosTotales(items.map((it, i) => ({ ...it, estimated_grams: gramos[i] ?? it.estimated_grams }))),
    [items, gramos],
  );

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
      setPaso(t('mob.foto.pasoPrep', 'Preparing the photo…'));
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
      setPaso(t('mob.foto.pasoSube', 'Saving it to your account…'));
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
      setPaso(t('mob.foto.pasoIA', 'Reading your plate…'));
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
          .select('detected_name, portion_description, estimated_grams, confidence')
          .eq('meal_id', id).order('created_at'),
      ]);
      if (fila.error) throw fila.error;

      const bruto: any = fila.data?.raw_ai_analysis ?? null;
      const detectados: ItemIA[] = (filas.data ?? []).map((f: any) => ({
        display_name: f.detected_name,
        portion_description: f.portion_description,
        estimated_grams: typeof f.estimated_grams === 'number' ? f.estimated_grams : undefined,
        confidence: typeof f.confidence === 'number' ? f.confidence : undefined,
      }));

      if (fila.data?.status === 'failed' || !borradorUtil({ ...bruto, items: detectados })) {
        const m = motivoFallo(fila.data?.failure_reason ?? (bruto?.is_food === false ? 'not_food' : ''));
        setError(t(m.clave, m.texto));
        setFase('fallo');
        return;
      }

      setItems(detectados);
      setGramos({});
      setNombre(String(bruto?.meal_name ?? ''));
      setConfianza(typeof fila.data?.ai_confidence === 'number' ? fila.data.ai_confidence : null);
      setTipo((prev) => tipoValido(bruto?.meal_type_guess, prev));
      setFase('borrador');
    } catch (e: any) {
      const m = motivoFallo(e?.message ?? '');
      setError(e?.message && !/^[a-z_]+$/.test(e.message) ? e.message : t(m.clave, m.texto));
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
      notify(t('mob.foto.guardada', 'Meal saved'), nombre || '');
      navigation.goBack();
    } catch (e: any) {
      setError(e?.message ?? t('mob.foto.errGuardar', 'It could not be saved.'));
      setFase('fallo');
    } finally { setPaso(''); }
  }, [mealId, gramos, items, tipo, nombre, userId, navigation, t]);

  const reinicia = () => {
    setFase('inicio'); setUri(null); setMealId(null);
    setItems([]); setGramos({}); setError(''); setNombre(''); setConfianza(null);
  };

  // ── Pintado ───────────────────────────────────────────────────────────────
  return (
    <View style={s.fill}>
      <LinearGradient colors={['#FCF1EC', '#FBE7DB']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={s.back}>‹</Text>
          </Pressable>
          <Text style={s.title}>{t('mob.foto.titulo', 'Photo of your meal')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={s.cuerpo} keyboardShouldPersistTaps="handled">
          {fase === 'inicio' && (
            <>
              <Text style={s.lead}>
                {t('mob.foto.lead', 'Take a photo and NutriSync will suggest what is on your plate. You can always correct it.')}
              </Text>
              <Pressable style={[s.boton, s.botonPri]} onPress={() => coge('camara')}>
                <Text style={s.botonPriTxt}>📷  {t('mob.foto.hacer', 'Take a photo')}</Text>
              </Pressable>
              <Pressable style={[s.boton, s.botonSec]} onPress={() => coge('galeria')}>
                <Text style={s.botonSecTxt}>🖼  {t('mob.foto.elegir', 'Choose from gallery')}</Text>
              </Pressable>
              <View style={s.privacidad}>
                <Text style={s.privTit}>🔒 {t('mob.foto.privTit', 'What happens to your photo')}</Text>
                <Text style={s.privTxt}>
                  {t('mob.foto.privTxt', 'It is stored in your private account. Only the image is sent for analysis — never your name, your cycle or your location, and the photo is stripped of its location data first.')}
                </Text>
              </View>
            </>
          )}

          {(fase === 'previa' || fase === 'borrador') && uri && (
            <Image source={{ uri }} style={s.foto} resizeMode="cover" />
          )}

          {fase === 'previa' && (
            <>
              <Text style={s.seccion}>{t('mob.foto.queEs', 'Which meal is it?')}</Text>
              <View style={s.chips}>
                {TIPOS.map((x) => (
                  <Pressable key={x.clave} onPress={() => setTipo(x.clave)}
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

          {fase === 'trabajando' && (
            <View style={s.centro}>
              <ActivityIndicator size="large" color={colors.coral} />
              {/* Decir en qué paso va: una espera con nombre se hace corta */}
              <Text style={s.paso}>{paso}</Text>
            </View>
          )}

          {fase === 'borrador' && (
            <>
              {!!nombre && <Text style={s.plato}>{nombre}</Text>}
              <View style={s.filaConf}>
                <Text style={s.seccion}>{t('mob.foto.detectado', 'What I can see')}</Text>
                <Text style={[s.conf, s['conf_' + nivelConfianza(confianza) as keyof typeof s] as any]}>
                  {t('mob.foto.conf.' + nivelConfianza(confianza),
                    nivelConfianza(confianza) === 'alta' ? 'High confidence'
                      : nivelConfianza(confianza) === 'media' ? 'Medium confidence'
                      : nivelConfianza(confianza) === 'baja' ? 'Low — please check' : '—')}
                </Text>
              </View>

              {items.map((it, i) => {
                const g = gramos[i] ?? it.estimated_grams ?? 0;
                return (
                  <View key={i} style={s.item}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemNom}>{it.display_name}</Text>
                      {!!it.portion_description && (
                        <Text style={s.itemPor}>{it.portion_description}</Text>
                      )}
                    </View>
                    <View style={s.pasos}>
                      <Pressable hitSlop={10} onPress={() =>
                        setGramos((p) => ({ ...p, [i]: Math.max(0, Math.round(g - 10)) }))}>
                        <Text style={s.pasoBtn}>−</Text>
                      </Pressable>
                      <Text style={s.gramos}>{Math.round(g)} g</Text>
                      <Pressable hitSlop={10} onPress={() =>
                        setGramos((p) => ({ ...p, [i]: Math.round(g + 10) }))}>
                        <Text style={s.pasoBtn}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              <Text style={s.total}>
                {t('mob.foto.total', 'Total')}: {Math.round(totalGramos)} g
              </Text>
              {/* P1 identifica; los macros llegan en P2 desde canonical_foods.
                  Se dice, no se disimula con un cero. */}
              <Text style={s.nota}>{t('mob.foto.macrosLuego',
                'Calories and macros arrive in the next update — for now your meal is saved with what it contains.')}</Text>

              <Pressable style={[s.boton, s.botonPri]} onPress={confirma}>
                <Text style={s.botonPriTxt}>✓  {t('mob.foto.confirmar', 'Looks right, save it')}</Text>
              </Pressable>
              <Pressable style={[s.boton, s.botonSec]} onPress={reinicia}>
                <Text style={s.botonSecTxt}>{t('mob.foto.otra', 'Take another one')}</Text>
              </Pressable>
            </>
          )}

          {fase === 'fallo' && (
            <View style={s.fallo}>
              <Text style={s.falloIco}>😕</Text>
              <Text style={s.falloTxt}>{error}</Text>
              <Pressable style={[s.boton, s.botonPri]} onPress={reinicia}>
                <Text style={s.botonPriTxt}>{t('mob.foto.reintentar', 'Try again')}</Text>
              </Pressable>
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
    paddingHorizontal: 20, paddingVertical: 12,
  },
  back: { fontSize: 30, color: colors.ink, lineHeight: 32 },
  title: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  cuerpo: { paddingHorizontal: 20, paddingBottom: 40 },
  lead: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.body, marginBottom: 22 },
  boton: {
    borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center', marginTop: 12,
  },
  botonPri: { backgroundColor: colors.coral },
  botonPriTxt: { fontFamily: font.semibold, fontSize: 16, color: colors.white },
  botonSec: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  botonSecTxt: { fontFamily: font.medium, fontSize: 15, color: colors.ink },
  privacidad: {
    marginTop: 26, backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.line,
  },
  privTit: { fontFamily: font.semibold, fontSize: 14, color: colors.ink, marginBottom: 6 },
  privTxt: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.body },
  foto: { width: '100%', height: 230, borderRadius: radius.lg, marginBottom: 18 },
  seccion: { fontFamily: font.semibold, fontSize: 15, color: colors.ink, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line,
  },
  chipOn: { backgroundColor: colors.coral, borderColor: colors.coral },
  chipTxt: { fontFamily: font.medium, fontSize: 13, color: colors.body },
  chipTxtOn: { color: colors.white },
  centro: { alignItems: 'center', paddingVertical: 70 },
  paso: { fontFamily: font.medium, fontSize: 14, color: colors.body, marginTop: 16 },
  plato: { fontFamily: font.semibold, fontSize: 20, color: colors.ink, marginBottom: 10 },
  filaConf: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  conf: { fontFamily: font.medium, fontSize: 12, marginBottom: 10 },
  conf_alta: { color: colors.good },
  conf_media: { color: colors.orange },
  conf_baja: { color: colors.coralDeep },
  conf_sin: { color: colors.muted },
  item: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: radius.md, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.line,
  },
  itemNom: { fontFamily: font.medium, fontSize: 15, color: colors.ink },
  itemPor: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  pasos: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pasoBtn: { fontFamily: font.semibold, fontSize: 22, color: colors.coral, width: 22, textAlign: 'center' },
  gramos: { fontFamily: font.semibold, fontSize: 14, color: colors.ink, minWidth: 54, textAlign: 'center' },
  total: { fontFamily: font.semibold, fontSize: 15, color: colors.ink, marginTop: 4 },
  nota: { fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 8 },
  fallo: { alignItems: 'center', paddingVertical: 40 },
  falloIco: { fontSize: 40, marginBottom: 12 },
  falloTxt: {
    fontFamily: font.regular, fontSize: 15, lineHeight: 22,
    color: colors.body, textAlign: 'center', marginBottom: 10,
  },
});
