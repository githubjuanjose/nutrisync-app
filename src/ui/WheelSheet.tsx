import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, Platform } from 'react-native';
import { colors, font } from '../theme';
import { useT } from '../i18n';
import { wheelIndex, wheelOffset } from '../lib/pickers';

/**
 * r11b · WheelSheet — industry-standard barrel picker (Apple-Health style) in
 * PURE JS: snap ScrollView, no native deps → ships over OTA and works on the
 * PWA. Values are valid by construction — the wheel IS the validation.
 */
const ITEM_H = 44;
const PAD = ITEM_H * 2; // two spacer rows above/below → selection band centered

export type WheelCol = {
  values: (string | number)[];
  selected: number;               // index
  onChange: (index: number) => void;
  suffix?: string;                // shown inside the wheel items ("cm", "kg"…)
};

function Wheel({ col }: { col: WheelCol }) {
  const ref = useRef<ScrollView>(null);
  const timer = useRef<any>(null);

  useEffect(() => {
    // Lo que se MUESTRA es la selección: confirmar el valor inicial al abrir,
    // así aceptar el por-defecto sin girar también cuenta (bug r11b-2).
    col.onChange(col.selected);
    // scroll inicial robusto (RN-mac a veces ignora el primer intento)
    const align = () => ref.current?.scrollTo({ y: wheelOffset(col.selected, ITEM_H, col.values.length), animated: false });
    const t1 = setTimeout(align, 30); const t2 = setTimeout(align, 180);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const settle = (y: number) => {
    const i = wheelIndex(y, ITEM_H, col.values.length);      // r12-b4: puro y testeado
    if (i !== col.selected) col.onChange(i);
  };

  return (
    <ScrollView
      ref={ref}
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      nestedScrollEnabled
      onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
      onScroll={(e) => {
        // PWA fallback: browsers don't always fire momentum-end — debounce raw scroll
        if (Platform.OS !== 'web') return;
        const y = e.nativeEvent.contentOffset.y;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => settle(y), 140);
      }}
      scrollEventThrottle={32}
      contentContainerStyle={{ paddingVertical: PAD }}
    >
      {col.values.map((v, i) => (
        <View key={i} style={s.item}>
          <Text style={[s.itemTxt, i === col.selected && s.itemOn]}>
            {String(v)}{col.suffix ? ` ${col.suffix}` : ''}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function WheelSheet({ visible, title, cols, onClose }: {
  visible: boolean; title: string; cols: WheelCol[]; onClose: () => void;
}) {
  const t = useT();
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.head}>
          <Text style={s.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10}><Text style={s.done}>{t('ui.done', 'Done')}</Text></Pressable>
        </View>
        <View style={s.wheels}>
          {/* selection band behind the wheels */}
          <View pointerEvents="none" style={s.band} />
          {cols.map((c, i) => <Wheel key={i} col={c} />)}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,23,21,.45)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 26, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: -6 }, elevation: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  title: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  done: { fontFamily: font.semibold, fontSize: 15, color: colors.coral },
  wheels: { flexDirection: 'row', height: ITEM_H * 5, marginHorizontal: 16, position: 'relative' },
  band: { position: 'absolute', left: 0, right: 0, top: ITEM_H * 2, height: ITEM_H, backgroundColor: '#FFF1EC', borderRadius: 12 },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemTxt: { fontFamily: font.regular, fontSize: 17, color: colors.faint },
  itemOn: { fontFamily: font.semibold, fontSize: 19, color: colors.ink },
});
