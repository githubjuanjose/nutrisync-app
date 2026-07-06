import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Dimensions, StyleProp, ViewStyle } from 'react-native';
import { font } from '../theme';
import { useI18n, Lang } from '../i18n';

/**
 * Shared language selector — pixel-matched to the web prototype's selector:
 *   • two compact ISO pills (English + OS/current language): dark = active, white+border = inactive
 *   • a small "•••" pill that opens a clean dropdown card
 *   • the dropdown is ANCHORED directly under the ••• button (measured) and drops down from there,
 *     exactly like the web (position: absolute; top: 100%; right: 0) — never floating detached.
 *   • rows = endonym (left) + tiny muted ISO code (right); no flags, no title, no country names
 * Offers only languages that actually have a bundle. Used on Welcome, Auth, and App Preferences.
 */

// Prototype palette (literal to stay faithful to Design).
const INK = '#231F20';        // active pill bg
const BORDER = '#E6D9CC';     // inactive pill / card border
const INACTIVE = '#6B615C';   // inactive pill text
const ROW = '#231F20';        // dropdown endonym
const ROW_ISO = '#B8ADA4';    // dropdown ISO code
const ROW_ON = '#FDF0E7';     // active/pressed row bg

type Anchor = { x: number; y: number; w: number; h: number };

export function LanguagePicker({ style, align = 'left' }: { style?: StyleProp<ViewStyle>; align?: 'left' | 'center' }) {
  const { lang, osLang, setLang, langs } = useI18n();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const moreRef = useRef<View>(null);

  const isoOf = (c: Lang) => c.toUpperCase();
  const pill2: Lang = lang !== 'en' ? lang : (osLang !== 'en' ? osLang : 'es');
  const more = langs
    .filter((l) => l.code !== 'en' && l.code !== pill2)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Measure the ••• button in window space, then open the card right beneath it.
  const openMenu = () => {
    const node = moreRef.current;
    if (!node) { setOpen(true); return; }
    node.measureInWindow((x, y, w, h) => { setAnchor({ x, y, w, h }); setOpen(true); });
  };

  const Pill = ({ code }: { code: Lang }) => {
    const on = lang === code;
    return (
      <Pressable onPress={() => setLang(code)} style={[styles.pill, on ? styles.pillOn : styles.pillOff]}>
        <Text style={[styles.pillTxt, on ? styles.pillTxtOn : styles.pillTxtOff]}>{isoOf(code)}</Text>
      </Pressable>
    );
  };

  // Card position: right edge aligned to the ••• right edge, opening downward (web: right:0; top:100%+6).
  const screenW = Dimensions.get('window').width;
  const cardStyle = anchor
    ? { position: 'absolute' as const, top: anchor.y + anchor.h + 6, right: Math.max(12, screenW - (anchor.x + anchor.w)) }
    : { position: 'absolute' as const, top: 96, right: 20 };

  return (
    <View style={[styles.row, align === 'center' && { justifyContent: 'center' }, style]}>
      <Pill code="en" />
      <Pill code={pill2} />
      {more.length > 0 && (
        <View ref={moreRef} collapsable={false}>
          <Pressable onPress={openMenu} style={[styles.pill, styles.pillOff, styles.moreBtn]} accessibilityLabel="More languages">
            <Text style={[styles.pillTxt, styles.pillTxtOff]}>•••</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.card, cardStyle]} onPress={() => {}}>
            <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={true}>
              {more.map((l) => {
                const on = lang === l.code;
                return (
                  <Pressable key={l.code} onPress={() => { setLang(l.code); setOpen(false); }}
                    style={[styles.item, on && styles.itemOn]}>
                    <Text style={styles.itemName}>{l.name}</Text>
                    <Text style={styles.itemIso}>{isoOf(l.code)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  // pills — prototype: radius 100, padding 8x16, 12.5px / 700
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  pillOff: { backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER },
  pillOn: { backgroundColor: INK },
  pillTxt: { fontFamily: font.bold, fontSize: 12.5 },
  pillTxtOff: { color: INACTIVE },
  pillTxtOn: { color: '#fff' },
  moreBtn: { paddingHorizontal: 14 },
  // full-screen catcher for outside-tap dismissal (transparent)
  backdrop: { flex: 1 },
  // dropdown card — anchored under the ••• button (position injected at runtime)
  card: { minWidth: 176, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 4,
    shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 24, shadowOffset: { width: 0, height: 16 }, elevation: 12 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 9 },
  itemOn: { backgroundColor: ROW_ON },
  itemName: { fontFamily: font.semibold, fontSize: 13, color: ROW },
  itemIso: { fontFamily: font.bold, fontSize: 10, color: ROW_ISO },
});
