import { Platform } from 'react-native';

/**
 * City-level location detection for the onboarding "where are you based?" step.
 *
 * - `ask=false` (silent): only proceeds if the OS permission is ALREADY granted —
 *   used on step mount so returning users get their city prefilled with zero prompts.
 * - `ask=true` (explicit): triggered by the "Use my location" button — requests the
 *   OS permission if needed, then resolves the city.
 *
 * Native only (iOS/Android): browsers can't reverse-geocode without a third-party
 * service, so on web we return null and the PWA keeps the manual input.
 * Coarse accuracy is plenty for a city name — we never store coordinates.
 */
export async function detectCity(ask: boolean): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const Location = require('expo-location');

    const perm = await Location.getForegroundPermissionsAsync();
    let granted = perm.granted;
    if (!granted && ask && perm.canAskAgain !== false) {
      granted = (await Location.requestForegroundPermissionsAsync()).granted;
    }
    if (!granted) return null;

    // Last known fix is instant; fall back to a fresh low-accuracy fix with a timeout.
    let pos = await Location.getLastKnownPositionAsync().catch(() => null);
    if (!pos) {
      pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }).catch(() => null),
        new Promise<null>((res) => setTimeout(() => res(null), 8000)),
      ]);
    }
    if (!pos) return null;

    const places = await Location.reverseGeocodeAsync({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
    const p = places?.[0];
    return (p?.city || p?.subregion || p?.region || null) as string | null;
  } catch {
    return null;
  }
}
