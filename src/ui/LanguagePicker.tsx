import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, StyleProp, ViewStyle } from 'react-native';
import { colors, font, radius, shadow } from '../theme';
import { useI18n, Lang } from '../i18n';

/**
 * Shared language selector: two quick pills (English + OS/current language) plus a
 * dropdown for the rest. Matches the web app's selector (ISO-code pills, endonym
 * list). Offers only languages that actually have a bundle. Used on the Welcome
 * screen and in App Preferences.
 */
export function LanguagePicker({ style, align = 'left' }: { style?: StyleProp<ViewStyle>; align?: 'left' | 'center' }) {
  const { lang, osLang, setLang, langs } = useI18n();
  const [open, setOpen] = useState(false);
  const nameOf = (c: Lang) => langs.find((l) => l.code === c)?.name ?? c;
  const isoOf = (c: Lang) => c.toUpperCase();
  const pill2: Lang = lang !== 'en' ? lang : (osLang !== 'en' ? osLang : 'es');
  const rest = langs.filter((l) => l.code !== 'en' && l.code !== pill2).sort((a, b) => a.name.localeCompare(b.name));

  const Pill = ({ code }: { code: Lang }) => {
    const on = lang === code;
    return (
      <Pressable onPress={() => setLang(code)} style={[styles.pill, on && styles.pillOn]}>
        <Text style={[styles.pillTxt, on && styles.pillTxtOn]}>{isoOf(code)}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.row, align === 'center' && { justifyContent: 'center' }, style]}>
      <Pill code="en" />
      <Pill code={pill2} />
      <Pressable onPress={() => setOpen(true)} style={styles.moreBtn}>
        <Text style={styles.moreTxt}>••• ▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Choose a language</Text>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {rest.map((l) => {
                const on = lang === l.code;
                return (
                  <Pressable key={l.code} onPress={() => { setLang(l.code); setOpen(false); }}
                    style={[styles.langItem, on && styles.langItemOn]}>
                    <Text style={[styles.langItemTxt, on && styles.langItemTxtOn]}>
                      <Text style={styles.langIso}>{isoOf(l.code)}</Text>  {l.name}
                    </Text>
                    {on ? <Text style={styles.check}>✓</Text> : null}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 15, height: 34, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.ink },
  pillTxt: { fontFamily: font.semibold, fontSize: 12.5, color: colors.muted },
  pillTxtOn: { color: '#fff' },
  moreBtn: { paddingHorizontal: 13, height: 34, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },
  moreTxt: { fontFamily: font.semibold, fontSize: 12.5, color: colors.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(28,23,21,.5)', alignItems: 'center', justifyContent: 'center', padding: 26 },
  sheet: { width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: radius.lg, padding: 16, ...shadow.card },
  sheetTitle: { fontFamily: font.semibold, fontSize: 16, color: colors.ink, marginBottom: 8, marginLeft: 4 },
  langItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 12, borderRadius: radius.md },
  langItemOn: { backgroundColor: '#FDECE6' },
  langItemTxt: { fontFamily: font.medium, fontSize: 15, color: colors.ink },
  langIso: { fontFamily: font.semibold, fontSize: 13, color: colors.muted },
  langItemTxtOn: { color: colors.coralDeep, fontFamily: font.semibold },
  check: { color: colors.coral, fontFamily: font.semibold, fontSize: 15 },
});
