import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Platform, BackHandler, Alert } from 'react-native';
import { Animated, Easing } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

/** R3-56 (F6): red outline consent icons per the wireframe — no emojis. */
function ConsentIcon({ name }: { name: string }) {
  const p = { stroke: '#E4572E', strokeWidth: 1.8, fill: 'none' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      {name === 'cycle' ? (<>
        <Circle cx={12} cy={12} r={8.2} {...p} />
        <Path d="M12 3.8v3M12 17.2v3M3.8 12h3M17.2 12h3" {...p} />
      </>) : name === 'salad' ? (<>
        <Path d="M4 12h16c0 4.4-3.6 7.5-8 7.5S4 16.4 4 12z" {...p} />
        <Path d="M8 12c0-3 1.5-5.5 4-7 2.5 1.5 4 4 4 7" {...p} />
      </>) : (<>
        <Rect x={6} y={10.5} width={12} height={8.5} rx={2} {...p} />
        <Path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" {...p} />
      </>)}
    </Svg>
  );
}
import { colors, font, radius, shadow } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { OnboardingLayout } from './OnboardingLayout';
import { SelectList } from '../../ui/SelectList';
import { NutriOrb } from '../../ui/NutriOrb';

/** F18 — the Nutri floats subtly on the onboarding screens (gentle 3.2s loop). */
function Floaty({ children }: { children: React.ReactNode }) {
  const y = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(y, { toValue: -7, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ])).start();
  }, [y]);
  return <Animated.View style={{ transform: [{ translateY: y }] }}>{children}</Animated.View>;
}
import { STEPS, Step } from './steps';
import { supabase } from '../../lib/supabase';
import { saveOnboarding } from '../../lib/api';
import { useSession } from '../../state/SessionProvider';
import { useT } from '../../i18n';
import { GoalCarousel } from '../../ui/GoalOrb';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const fmtDate = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
const toISO = (d: Date) => d.toISOString().slice(0, 10);

/** Orange orb with the exact Figma blue-tinted halo (onboarding hero variant). */
function HaloOrb({ size = 180 }: { size?: number }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: size + 20 }}>
      <Floaty><NutriOrb size={size * 1.15} withHalo /></Floaty>
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

  // Start the whole flow over (clears every answer) — confirmed first.
  const restart = () => {
    Alert.alert(
      t('mob.startOver', 'Start over?'),
      t('mob.startOverBody', 'This clears your answers so far and takes you back to the first step.'),
      [
        { text: t('ui.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('mob.startOver', 'Start over'), style: 'destructive', onPress: () => {
            setIdx(0); setAnswers({}); setCity(''); setAgree(false);
            setResearch(false); setPeriodDate(null); setSaveErr('');
          },
        },
      ]
    );
  };

  // Android hardware back → step back within the wizard instead of leaving the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => sub.remove();
  }, [idx]);

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
        dietOther: (answers['nutritionDiet'] ?? [])[0] === 'Other' ? (dietOther.trim() || undefined) : undefined,
      });
      // F20 (fixed in R4-r4c): persist the selected NutriGoal with the REAL user
      // id — the old block referenced an undefined `userId` and its catch{}
      // swallowed the ReferenceError, so the goal silently never saved.
      const g = (answers['nutriGoal'] ?? [])[0];
      if (g) {
        const { error: gErr } = await supabase.from('users').update({ nutrigoal: g }).eq('id', user.id);
        if (gErr) throw gErr;
      }
      // Onboarding complete → the session-aware navigator swaps to the main app.
      await refreshOnboarding();
    } catch (e: any) {
      setSaveErr(e?.message ?? 'Could not save. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const [dietOther, setDietOther] = useState('');

  // R3-52: 'None of the above' is exclusive — picking it clears the rest,
  // picking a condition clears it.
  const EXCLUSIVE = 'None of the above';
  const toggle = (id: string, value: string, multi?: boolean) =>
    setAnswers((p) => {
      const cur = p[id] ?? [];
      if (multi) {
        if (value === EXCLUSIVE) return { ...p, [id]: cur.includes(EXCLUSIVE) ? [] : [EXCLUSIVE] };
        const nxt = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur.filter((v) => v !== EXCLUSIVE), value];
        return { ...p, [id]: nxt };
      }
      return { ...p, [id]: [value] };
    });

  // ---- Question step ----
  // F1 (Wave 1): all onboarding copy renders through ob.* i18n keys with the
  // English text as fallback. Canonical option VALUES stay English — only the
  // displayed labels translate, so onboardingMap / Supabase parity is untouched.
  const kk = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (step.kind === 'question') {
    const sel = answers[step.id] ?? [];
    const opts = step.options.map((o) => ({
      ...o,
      label: t(`ob.${step.id}.opt.${kk(o.value)}`, o.label),
      sub: o.sub ? t(`ob.${step.id}.opt.${kk(o.value)}_sub`, o.sub) : o.sub,
    }));
    return (
      <OnboardingLayout
        progress={step.progress} stepLabel={step.stepLabel}
        onBack={back} onRestart={restart} onNext={next} nextDisabled={sel.length === 0}
      >
        <Text style={styles.section}>{t(`ob.sec.${kk(step.section)}`, step.section)}</Text>
        {step.sectionItalic ? <Text style={styles.sectionItalic}>{t('ob.accurate', step.sectionItalic)}</Text> : null}
        <Text style={styles.question}>{t(`ob.${step.id}.q`, step.question)}</Text>
        {step.helper ? <Text style={styles.helper}>{t(`ob.${step.id}.h`, step.helper)}</Text> : null}
        {step.description ? (
          <View style={{ marginTop: 10, marginBottom: 4 }}>
            <Highlighted
              text={t(`ob.${step.id}.d`, step.description.text)}
              highlight={t(`ob.${step.id}.dh`, step.description.highlight ?? '')}
            />
          </View>
        ) : null}
        <View style={{ marginTop: 22 }}>
          {step.id === 'nutriGoal' ? (
            /* R4-F1: goal step is a swipeable gradient bubble, not a list */
            <GoalCarousel options={opts as any} selected={sel} onSelect={(v) => toggle(step.id, v, false)} />
          ) : (
          <SelectList options={opts} selected={sel} multi={step.multi} onToggle={(v) => toggle(step.id, v, step.multi)} />
          )}
          {step.id === 'nutritionDiet' && sel.includes('Other') ? (
            /* R3-54: tell us the diet — input directly under the list, never covered */
            <TextInput
              value={dietOther} onChangeText={setDietOther}
              placeholder={t('mob.dietOtherPh', 'Tell us the plan you follow…')}
              placeholderTextColor={colors.faint} returnKeyType="done"
              style={styles.otherInput}
            />
          ) : null}
        </View>
      </OnboardingLayout>
    );
  }

  // ---- Beta welcome ----
  if (step.kind === 'betaWelcome') {
    return (
      <OnboardingLayout progress={1} showBack={false} nextFull nextLabel={t('ob.beta.start', "Lets get Started")} onNext={next}>
        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <HaloOrb size={170} />
          <Text style={styles.eyebrow}>BETA</Text>
          <Text style={styles.hero}>{t('mob.earlyTester', "You're an early tester")}</Text>
          <Text style={{ fontSize: 26, marginTop: 6 }}>❤️</Text>
          <Text style={styles.heroSub}>
            {t('ob.beta.sub', "Welcome to the NutriSync beta! You're among the first to try it. A few onboarding questions help us shape what's coming next, so some features are still on the way.")}
          </Text>
          <View style={styles.infoCard}>
            <Text style={{ fontSize: 18, marginRight: 10 }}>💡</Text>
            <Text style={styles.infoTxt}>
              {t('ob.beta.info', 'Your feedback directly guides what we build. Spot something? Tap')}{' '}
              <Text style={{ color: colors.coral, fontFamily: font.semibold }}>{t('mob.sendFeedback', "Send feedback")}</Text> {t('ob.beta.info2', 'anytime in Settings.')}
            </Text>
          </View>
        </View>
      </OnboardingLayout>
    );
  }

  // ---- Last period start date (critical field) ----
  if (step.kind === 'periodDate') {
    return (
      <OnboardingLayout progress={step.progress} stepLabel={step.stepLabel} onBack={back} onRestart={restart} onNext={next} nextDisabled={!periodDate}>
        <Text style={styles.section}>{t('mob.cycleInfo', "Cycle Info")}</Text>
        <Text style={styles.sectionItalic}>{t('ob.accurate', 'Be as accurate as possible so NutriSync can give you tailored results.')}</Text>
        <Text style={styles.question}>{t('mob.lastPeriodStart', "When did your last period start?")}</Text>
        <Text style={styles.helper}>{t('ob.period.h', "This is the single most important answer — it's how we work out your phase each day.")}</Text>
        <Pressable style={styles.dateBtn} onPress={() => setShowPicker(true)}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M7 2v3M17 2v3M3.5 9h17M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" stroke={colors.coral} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          </Svg>
          <Text style={[styles.dateTxt, !periodDate && { color: colors.faint }]}>
            {periodDate ? fmtDate(periodDate) : t('ob.period.pick', 'Tap to choose a date')}
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
      <OnboardingLayout progress={step.progress} stepLabel={step.stepLabel} onBack={back} onRestart={restart} onNext={next} nextDisabled={!city.trim()}>
        <Text style={styles.section}>{t('mob.almostThere', "Almost there")}</Text>
        <Text style={styles.question}>{t('mob.whereBased', "And finally, where are you based?")}</Text>
        <Text style={styles.helper}>{t('ob.city.h', 'This helps NutriSync localise tips and get a better understanding of you!')}</Text>
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
      { icon: 'cycle', title: t('ob.consent.p1t', 'Your Cycle and Symptoms'), desc: t('ob.consent.p1d', 'To sync meals and movement to your phase.') },
      { icon: 'salad', title: t('ob.consent.p2t', 'Goals & Preferences'), desc: t('ob.consent.p2d', 'To tailor recommendations to you.') },
      { icon: 'lock', title: t('ob.consent.p3t', 'Stored Securely'), desc: t('ob.consent.p3d', 'Encrypted, never sold, deletable any time.') },
    ];
    return (
      <OnboardingLayout progress={1} onBack={back} onRestart={restart} nextFull nextLabel={t('ob.consent.cta', 'Agree and Continue')} onNext={next} nextDisabled={!agree}>
        <View style={{ alignItems: 'center' }}>
          <HaloOrb size={150} />
          <Text style={styles.hero}>{t('ob.consent.hero', 'Your data stays yours')}</Text>
          <Text style={styles.heroSub}>{t('ob.consent.sub', "We only collect what's needed to personalise your cycle guidance.")}</Text>
        </View>
        <View style={{ marginTop: 20, gap: 12 }}>
          {pillars.map((p) => (
            <View key={p.title} style={styles.pillar}>
              <ConsentIcon name={p.icon} />
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
              {t('ob.consent.agree1', "I agree to NutriSync's")} <Text style={styles.link}>{t('mob.privacyPolicy', "Privacy Policy")}</Text> {t('ob.consent.and', 'and')} <Text style={styles.link}>{t('mob.terms', "Terms")}</Text>{t('ob.consent.agree2', ', and consent to the processing of my health data to personalise my guidance.')} <Text style={styles.req}>{t('ob.consent.req', '(Required)')}</Text>
            </Text>
          </ConsentRow>
          <ConsentRow checked={research} onToggle={() => setResearch(!research)}>
            <Text style={styles.consentTxt}>
              {t('ob.consent.research', "Use my anonymised data to improve NutriSync and women's health research.")} <Text style={styles.opt}>{t('ob.consent.opt', '(Optional)')}</Text>
            </Text>
          </ConsentRow>
        </View>
      </OnboardingLayout>
    );
  }

  // ---- All set ----
  return (
    <OnboardingLayout
      progress={1} onBack={back} onRestart={restart} nextFull
      nextLabel={saving ? t('ui.saving', 'Saving…') : t('ui.enterApp', 'Enter NutriSync')} onNext={finish} nextDisabled={saving}
    >
      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <HaloOrb size={200} />
        <Text style={styles.eyebrow}>{t('mob.welcomeCaps', "WELCOME")}</Text>
        <Text style={styles.hero}>{t('mob.allSet', "You're all set!")}</Text>
        <Text style={styles.heroSub}>
          {t('ob.done.sub', 'Nutri has built your first phase plan from your answers. Your personalised nutrition & movement guidance is ready.')}
        </Text>
        {saveErr ? <Text style={styles.saveErr}>{saveErr}</Text> : null}
        <Text style={styles.footNote}>{t('ob.done.note', 'You can update these answers anytime in Settings.')}</Text>
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
  otherInput: { backgroundColor: colors.white, borderRadius: radius.md, height: 52, paddingHorizontal: 16, marginTop: 12, fontFamily: font.regular, fontSize: 14.5, color: colors.ink, ...shadow.card },
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
