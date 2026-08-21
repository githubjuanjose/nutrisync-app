export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  CreateAccount: undefined;
  // Shown while `onboarded` is still unknown (r17-j: existía en el navigator
  // desde el principio, pero nunca se declaró aquí — tsc llevaba razón)
  Splash: undefined;
  // Onboarding (single wizard flow)
  Onboarding: undefined;
  // Daily gate
  MoodEnergy: undefined;
  // Main app
  Main: undefined;
  // Detail screens
  EditPeriod: undefined;
  EditHealth: undefined;
  EditNutriGoal: undefined;
  MealLog: { fecha?: string } | undefined;
  MealHistory: undefined;
  MealPhoto: { fecha?: string } | undefined;
  AddIngredients: { mealId: string };
  EditarEscaneo: { mealId: string; mealLogId?: number };
  LogMovement: undefined;
  MovementHistory: undefined;
  NotificationCenter: undefined;
  // Settings
  SettingsProfile: undefined;
  CycleHealth: undefined;
  Feedback: undefined;
  CASHistory: undefined;
  Security: undefined;
  DataPrivacy: undefined;
  CommunityPrivacy: undefined;
  AppPreferences: undefined;
  NutritionalPreferences: undefined;
  SendFeedback: undefined;
};

export type MainTabParamList = {
  Calendar: undefined;
  Cycle: undefined;
  NutriLog: undefined;
  Movement: undefined;
  Progress: undefined;
};
