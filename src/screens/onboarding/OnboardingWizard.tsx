import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import { colors, font, radius, shadow } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { OnboardingLayout } from './OnboardingLayout';
import { SelectList } from '../../ui/SelectList';
import { NutriOrb } from '../../ui/NutriOrb';
import { STEPS, Step } from './steps';
import { supabase } from '../../lib/supabase';
import { saveOnboarding } from '../../lib/api';
import { useSession } from '../../state/SessionProvider';
import { useT } from '../../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const fmtDate = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
const toISO = (d: Date) => d.toISOString().slice(0, 10);

/** Orange orb with the exact Figma blue-tinted halo (onboarding hero variant). */
function HaloOrb({ size = 180 }: { size?: number }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: size + 20 }}>
      <NutriOrb size={size * 1.15} withHalo />
    </View>
  );
}

function Highlighted({ text, highlight }: { text: string; highlight?: string }) {
  if (!highlight || !text.includes(highlight)) return <Text style={styles.desc}>{text}</Text>;
  const [a, b] = text.split(highlight);
  return (
    <Text style={styles.desc}>
      {a}<Text style={{ color: colors.coral }}>{highlight}</Text>{b}
    </Text>
  );
}

export default function OnboardingWizard({ navigation }: Props) {
  const t = useT();
  const { refreshOnboarding } = useSession();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [city, setCity] = useState('');
  const [agree, setAgree] = useState(false);
  const [research, setResearch] = useState(false);
  const [periodDate, setPeriodDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  const step = STEPS[idx] as Step;

  const next = () => (idx >= STEPS.length - 1 ? finish() : setIdx(idx + 1));
  const back = () => (idx <= 0 ? navigation.goBack() : setIdx(idx - 1));

  // Persist onboarding to Supabase, then enter the app.
  const finish = async () => {
    setSaveErr('');
    setSaving(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) throw new Error('Your session expired — please log in again.');
      await saveOnboarding(user.id, answers, {
        firstName: (user.user_metadata?.first_name as string) ?? undefined,
        email: user.email ?? undefined,
        city: city.trim() || undefined,
        lastPeriodStart: toISO(periodDate ?? new Date()),
      });
      // Onboarding complete → the session-aware navigator swaps to the main app.
      await refreshOnboarding();
    } catch (e: any) {
      setSaveErr(e?.message ?? 'Could not save. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (id: string, value: string, multi?: boolean) =>
    setAnswers((p) => {
      const cur = p[id] ?? [];
      if (multi) return { ...p, [id]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
      return { ...p, [id]: [value] };
    });

  // ---- Question step ----
  if (step.kind === 'question') {
    const sel = answers[step.id] ?? [];
    return (
      <OnboardingLayout
        progress={step.progress} stepLabel={step.stepLabel}
        onBack={back} onNext={next} nextDisabled={sel.length === 0}
      >
        <Text style={styles.section}>{step.section}</Text>
        {step.sectionItalic ? <Text style={styles.sectionItalic}>{step.sectionItalic}</Text> : null}
        <Text style={styles.question}>{step.question}</Text>
        {step.helper ? <Text style={styles.helper}>{step.helper}</Text> : null}
        {step.description ? (
          <View style={{ marginTop: 10, marginBottom: 4 }}>
            <Highlighted text={step.description.text} highlight={step.description.highlight} />
          </View>
        ) : null}
        <View style={{ marginTop: 22 }}>
          <SelectList options={step.options} selected={sel} multi={step.multi} onToggle={(v) => toggle(step.id, v, step.multi)} />
        </View>
      </OnboardingLayout>
    );
  }

  // ---- Beta welcome ----
  if (step.kind === 'betaWelcome') {
    return (
      <OnboardingLayout progress={1} showBack={false} nextFull nextLabel="Lets get Started" onNext={next}>
        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <HaloOrb size={170} />
          <Text style={styles.eyebrow}>BETA</Text>
          <Text style={styles.hero}>{t('mob.earlyTester', "You're an early tester")}</Text>
          <Text style={{ fontSize: 26, marginTop: 6 }}>❤️</Text>
          <Text style={styles.heroSub}>
            Welcome to the NutriSync beta! You're among the first to try it. A few onboarding
            questions help us shape what's coming next, so some features are still on the way.
          </Text>
          <View style={styles.infoCard}>
            <Text style={{ fontSize: 18, marginRight: 10 }}>💡</Text>
            <Text style={styles.infoTxt}>
              Your feedback directly guides what we build. Spot something? Tap{' '}
              <Text style={{ color: colors.coral, fontFamily: font.semibold }}>{t('mob.sendFeedback', "Send feedback")}</Text> anytime in Settings.
            </Text>
          </View>
        </View>
      </OnboardingLayout>
    );
  }

  // ---- Last period start date (critical field) ----
  if (step.kind === 'periodDate') {
    return (
      <OnboardingLayout progress={step.progress} stepLabel={step.stepLabel} onBack={back} onNext={next} nextDisabled={!periodDate}>
        <Text style={styles.section}>{t('mob.cycleInfo', "Cycle Info")}</Text>
        <Text style={styles.sectionItalic}>Be as accurate as possible so NutriSync can give you tailored results.</Text>
        <Text style={styles.question}>{t('mob.lastPeriodStart', "When did your last period start?")}</Text>
        <Text style={styles.helper}>This is the single most important answer — it's how we work out your phase each day.</Text>
        <Pressable style={styles.dateBtn} onPress={() => setShowPicker(true)}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M7 2v3M17 2v3M3.5 9h17M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" stroke={colors.coral} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          </Svg>
          <Text style={[styles.dateTxt, !periodDate && { color: colors.faint }]}>
            {periodDate ? fmtDate(periodDate) : 'Tap to choose a date'}
          </Text>
        </Pressable>
        {showPicker && (
          <DateTimePicker
            value={periodDate ?? new Date()}
            mode="date"
            maximumDate={new Date()}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_e, d) => {
              if (Platform.OS !== 'ios') setShowPicker(false);
              if (d) setPeriodDate(d);
            }}
          />
        )}
      </OnboardingLayout>
    );
  }

  // ---- City ----
  if (step.kind === 'city') {
    return (
      <OnboardingLayout progress={step.progress} stepLabel={step.stepLabel} onBack={back} onNext={next} nextDisabled={!city.trim()}>
        <Text style={styles.section}>{t('mob.almostThere', "Almost there")}</Text>
        <Text style={styles.question}>{t('mob.whereBased', "And finally, where are you based?")}</Text>
        <Text style={styles.helper}>This helps NutriSync localise tips and get a better understanding of you!</Text>
        <View style={styles.cityInput}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M12 22s7-6.6 7-12a7 7 0 10-14 0c0 5.4 7 12 7 12z" fill={colors.coral} />
            <Path d="M12 11.5a2.2 2.2 0 100-4.4 2.2 2.2 0 000 4.4z" fill="#fff" />
          </Svg>
          <TextInput
            value={city} onChangeText={setCity} placeholder={t('mob.typeCity', "Type your city...")} placeholderTextColor={colors.faint}
            style={styles.cityText}
          />
        </View>
      </OnboardingLayout>
    );
  }

  // ---- Consent ----
  if (step.kind === 'consent') {
    const pillars = [
      { icon: '★', title: 'Your Cycle and Symptoms', desc: 'To sync meals and movement to your phase.' },
      { icon: '🥗', title: 'Goals & Prefrences', desc: 'To tailor recommendations to you.' },
      { icon: '🔒', title: 'Stored Securely', desc: 'Encrypted, never sold, deletable any time.' },
    ];
    return (
      <OnboardingLayout progress={1} showBack={false} nextFull nextLabel="Agree and Continue" onNext={next} nextDisabled={!agree}>
        <View style={{ alignItems: 'center' }}>
          <HaloOrb size={150} />
          <Text style={styles.hero}>You're data stays yours</Text>
          <Text style={styles.heroSub}>We only collect what's needed to personalise your cycle guidance.</Text>
        </View>
        <View style={{ marginTop: 20, gap: 12 }}>
          {pillars.map((p) => (
            <View key={p.title} style={styles.pillar}>
              <Text style={styles.pillarIcon}>{p.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.pillarTitle}>{p.title}</Text>
                <Text style={styles.pillarDesc}>{p.desc}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 16, gap: 12 }}>
          <ConsentRow checked={agree} onToggle={() => setAgree(!agree)}>
            <Text style={styles.consentTxt}>
              I agree to NutriSync's <Text style={styles.link}>{t('mob.privacyPolicy', "Privacy Policy")}</Text> and <Text style={styles.link}>{t('mob.terms', "Terms")}</Text>,
              and consent to the processing of my health data to personalise my guidance. <Text style={styles.req}>(Required)</Text>
            </Text>
          </ConsentRow>
          <ConsentRow checked={research} onToggle={() => setResearch(!research)}>
            <Text style={styles.consentTxt}>
              Use my anonymised data to improve NutriSync and women's health reaserch. <Text style={styles.opt}>(Optional)</Text>
            </Text>
          </ConsentRow>
        </View>
      </OnboardingLayout>
    );
  }

  // ---- All set ----
  return (
    <OnboardingLayout
      progress={1} showBack={false} nextFull
      nextLabel={saving ? 'Saving…' : t('ui.enterApp', 'Enter NutriSync')} onNext={finish} nextDisabled={saving}
    >
      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <HaloOrb size={200} />
        <Text style={styles.eyebrow}>{t('mob.welcomeCaps', "WELCOME")}</Text>
        <Text style={styles.hero}>{t('mob.allSet', "You're all set!")}</Text>
        <Text style={styles.heroSub}>
          Nutri has built your first phase plan from your answers. Your personalised nutrition &
          movement guidance is ready.
        </Text>
        {saveErr ? <Text style={styles.saveErr}>{saveErr}</Text> : null}
        <Text style={styles.footNote}>you can update these answers anytime in settings.</Text>
      </View>
    </OnboardingLayout>
  );
}

function ConsentRow({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <View style={[styles.consentRow, checked && { borderColor: '#5B8DEF' }]}>
      <Text onPress={onToggle} style={[styles.consentBox, checked && { backgroundColor: '#5B8DEF', borderColor: '#5B8DEF' }]}>
        {checked ? <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text> : null}
      </Text>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: font.semibold, fontSize: 22, color: colors.coral },
  sectionItalic: { fontFamily: font.regular, fontStyle: 'italic', fontSize: 13.5, color: colors.coral, marginTop: 6 },
  question: { fontFamily: font.semibold, fontSize: 23, color: colors.ink, marginTop: 18, lineHeight: 30 },
  helper: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: 8, lineHeight: 20 },
  desc: { fontFamily: font.regular, fontSize: 14.5, color: colors.ink, lineHeight: 21 },
  // hero blocks
  halo: { backgroundColor: '#6E86F5', opacity: 0.28 },
  eyebrow: { fontFamily: font.bold, fontSize: 12, letterSpacing: 2, color: colors.coral, marginTop: 10 },
  hero: { fontFamily: font.regular, fontSize: 38, color: colors.ink, textAlign: 'center', lineHeight: 42 },
  heroSub: { fontFamily: font.regular, fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 12, lineHeight: 22, paddingHorizontal: 6 },
  infoCard: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.md, padding: 16, marginTop: 22, ...shadow.card },
  infoTxt: { flex: 1, fontFamily: font.regular, fontSize: 13, color: colors.body, lineHeight: 19 },
  // city
  cityInput: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 20, height: 56, marginTop: 26, ...shadow.card },
  cityText: { flex: 1, fontFamily: font.regular, fontSize: 15, color: colors.ink },
  // date
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.md, paddingHorizontal: 18, height: 58, marginTop: 26, ...shadow.card },
  dateTxt: { fontFamily: font.medium, fontSize: 15, color: colors.ink },
  saveErr: { fontFamily: font.medium, fontSize: 13, color: colors.coralDeep, textAlign: 'center', marginTop: 14 },
  // consent pillars
  pillar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: '#F3D9C9' },
  pillarIcon: { fontSize: 18, color: colors.coral, width: 24, textAlign: 'center' },
  pillarTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.coral },
  pillarDesc: { fontFamily: font.regular, fontSize: 12.5, color: colors.body, marginTop: 2 },
  consentRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: colors.white, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.line },
  consentBox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#CBB', textAlign: 'center', lineHeight: 20, overflow: 'hidden' },
  consentTxt: { fontFamily: font.regular, fontSize: 12.5, color: colors.body, lineHeight: 18 },
  link: { color: colors.coral, fontFamily: font.medium },
  req: { color: colors.coral, fontSize: 11 },
  opt: { color: colors.muted, fontSize: 11 },
  footNote: { fontFamily: font.regular, fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 22 },
});
