/** The top-8 health/wearable providers (backlog Epic E). */
export type Provider = {
  key: string;
  name: string;
  icon: string;
  platform: 'ios' | 'android' | 'both';
  native: boolean;      // true = phone health platform needing a native dev build (HealthKit / Health Connect)
  scopes: string[];
};

export const PROVIDERS: Provider[] = [
  { key: 'apple_health',   name: 'Apple Health',        icon: '🍎', platform: 'ios',     native: true,  scopes: ['steps', 'sleep', 'heart_rate', 'workouts', 'cycle'] },
  { key: 'health_connect', name: 'Health Connect',      icon: '🤖', platform: 'android', native: true,  scopes: ['steps', 'sleep', 'heart_rate', 'workouts'] },
  { key: 'samsung',        name: 'Samsung Health',      icon: '📲', platform: 'android', native: true,  scopes: ['steps', 'sleep', 'heart_rate'] },
  { key: 'garmin',         name: 'Garmin',              icon: '⌚', platform: 'both',    native: false, scopes: ['activity', 'sleep', 'stress', 'heart_rate'] },
  { key: 'fitbit',         name: 'Fitbit',              icon: '⌚', platform: 'both',    native: false, scopes: ['steps', 'sleep', 'heart_rate'] },
  { key: 'strava',         name: 'Strava',              icon: '🏃', platform: 'both',    native: false, scopes: ['activities'] },
  { key: 'oura',           name: 'Oura Ring',           icon: '💍', platform: 'both',    native: false, scopes: ['sleep', 'readiness', 'hrv', 'temperature'] },
  { key: 'huawei',         name: 'Huawei Health',       icon: '📲', platform: 'both',    native: false, scopes: ['activity', 'sleep', 'heart_rate'] },
  { key: 'xiaomi',         name: 'Xiaomi (Mi Fitness)', icon: '📲', platform: 'both',    native: false, scopes: ['activity', 'sleep', 'heart_rate'] },
];
