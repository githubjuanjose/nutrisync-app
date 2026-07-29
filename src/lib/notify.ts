import { Alert, Platform } from 'react-native';

type Btn = { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };

/**
 * PWA parity: react-native-web does NOT implement Alert — on the web every
 * Alert.alert was a silent no-op (save errors, confirmations… all invisible).
 * notify() keeps the exact Alert.alert signature and falls back to
 * window.alert / window.confirm on the web.
 */
export function notify(title: string, message?: string, buttons?: Btn[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons as any);
    return;
  }
  const text = message ? `${title}\n\n${message}` : title;
  if (buttons && buttons.length > 1) {
    const ok = (globalThis as any).confirm ? (globalThis as any).confirm(text) : true;
    const cancel = buttons.find((b) => b.style === 'cancel') ?? buttons[buttons.length - 1];
    const accept = buttons.find((b) => b.style !== 'cancel') ?? buttons[0];
    (ok ? accept : cancel)?.onPress?.();
  } else {
    if ((globalThis as any).alert) (globalThis as any).alert(text);
    buttons?.[0]?.onPress?.();
  }
}
