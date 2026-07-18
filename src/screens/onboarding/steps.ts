import { Option } from '../../ui/SelectList';

export type Step =
  | {
      kind: 'question';
      id: string;
      section: string;
      sectionItalic?: string;
      question: string;
      helper?: string;
      description?: { text: string; highlight?: string };
      options: Option[];
      multi?: boolean;
      stepLabel: string;
      progress: number;
    }
  | { kind: 'betaWelcome'; id: string }
  | { kind: 'periodDate'; id: string; stepLabel: string; progress: number }
  | { kind: 'city'; id: string; stepLabel: string; progress: number }
  | { kind: 'consent'; id: string }
  | { kind: 'allSet'; id: string };

const opt = (arr: (string | [string, string])[]): Option[] =>
  arr.map((a) =>
    Array.isArray(a) ? { value: a[0], label: a[0], sub: a[1] } : { value: a, label: a }
  );

/** Onboarding sequence built from the Figma frames. */
export const STEPS: Step[] = [
  { kind: 'betaWelcome', id: 'beta' },

  { kind: 'periodDate', id: 'periodDate', stepLabel: '1/8', progress: 0.1 },

  {
    kind: 'question', id: 'cycleLength', section: 'Cycle Info',
    sectionItalic: 'Be as accurate as possible so NutriSync can give you tailored results.',
    question: 'How long is your average menstrual cycle?',
    helper: 'From the first day of one period to the first day of the next.',
    options: opt(['Less than 21 days', '21-25 days', '26-30 days', '31-35 days', 'other/not sure']),
    stepLabel: '2/8', progress: 0.20,
  },
  {
    kind: 'question', id: 'periodLength', section: 'Cycle Info',
    question: 'How many days does your period usually last?',
    options: opt(['1 - 2 days', '3 - 4 days', '5 - 7 days', '7 - 8 days', 'more than 8 days']),
    stepLabel: '3/8', progress: 0.34,
  },

  {
    kind: 'question', id: 'healthCondition', section: 'Health Condition',
    question: 'Have you ever been diagnosed with any of the following conditions?',
    options: opt(['Fibroids', 'Endometriosis', 'PMOS', 'Ovarian Cysts', 'Infertility', 'Perimenopause', 'None of the above']),
    multi: true, stepLabel: '2/4', progress: 0.5,
  },
  {
    kind: 'question', id: 'contraceptives', section: 'Hormonal Contraceptives',
    question: 'Do you use hormonal contraception?',
    description: {
      text: 'Such as the pill, hormonal IUD, implant, patch or ring. It changes your natural cycle, so Nutri adapts to it accordingly.',
      highlight: 'the pill, hormonal IUD, implant, patch or ring.',
    },
    options: [
      { value: 'yes', label: 'Yes, currently', sub: 'Im using a hormonal method right now' },
      { value: 'past', label: 'Not anymore', sub: "I've used one before, but not anymore" },
      { value: 'never', label: 'Never', sub: "I've never used hormonal contraception" },
    ],
    stepLabel: '4/4', progress: 1,
  },

  {
    kind: 'question', id: 'nutritionDiet', section: 'Nutritional Prefrences',
    question: 'Do you follow any specific nutrition plan?',
    options: opt(['Balanced Diet', 'Keto', 'Vegetarian', 'Low Carb', 'Pescatarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'No diet', 'Other']),
    stepLabel: '1/1', progress: 1,
  },

  {
    kind: 'question', id: 'nutriGoal', section: 'Your NutriGoal',
    question: "What's your primary goal?",
    options: opt(['Reduce physical PMS symptoms', 'Feel more emotionally balanced', 'More stable energy throughout my cycle']),  // R3-55: three goals
    stepLabel: '1/1', progress: 1,
  },

  { kind: 'city', id: 'city', stepLabel: '1/1', progress: 1 },
  { kind: 'consent', id: 'consent' },
  { kind: 'allSet', id: 'allSet' },
];
