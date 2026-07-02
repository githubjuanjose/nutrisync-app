/** Maps onboarding answer labels → the DB values defined in the schema (§14). */

export const CYCLE_LENGTH: Record<string, number> = {
  'Less than 21 days': 20, '21-25 days': 23, '26-30 days': 28, '31-35 days': 33, 'other/not sure': 28,
};
export const PERIOD_DURATION: Record<string, number> = {
  '1 - 2 days': 2, '3 - 4 days': 4, '5 - 7 days': 6, '7 - 8 days': 8, 'more than 8 days': 9,
};
export const DIET: Record<string, string> = {
  'Balanced Diet': 'balanced', Keto: 'keto', Vegetarian: 'vegetarian', 'Low Carb': 'low_carb',
  Pescatarian: 'pescatarian', Vegan: 'vegan', 'No diet': 'none',
};
export const CONTRACEPTION: Record<string, string> = {
  yes: 'yes_currently', past: 'not_anymore', never: 'never',
};

const first = (a?: string[]) => (a && a.length ? a[0] : undefined);

/** Build the `users` + `cycles` payloads from collected answers. */
export function buildPayloads(
  userId: string,
  answers: Record<string, string[]>,
  extra: { firstName?: string; email?: string; city?: string; lastPeriodStart: string }
) {
  const usersRow = {
    id: userId,
    first_name: extra.firstName ?? null,
    email: extra.email ?? null,
    city: extra.city ?? null,
    diet_type: DIET[first(answers.nutritionDiet) ?? ''] ?? 'none',
    health_conditions: (answers.healthCondition ?? [])
      .filter((v) => v !== 'None of the above')
      .map((v) => v.toLowerCase().replace(/\s+/g, '_')),
    contraception_status: CONTRACEPTION[first(answers.contraceptives) ?? ''] ?? null,
  };
  const cyclesRow = {
    user_id: userId,
    last_period_start_date: extra.lastPeriodStart, // YYYY-MM-DD (required)
    cycle_length: CYCLE_LENGTH[first(answers.cycleLength) ?? ''] ?? 28,
    period_duration: PERIOD_DURATION[first(answers.periodLength) ?? ''] ?? 5,
  };
  return { usersRow, cyclesRow };
}
