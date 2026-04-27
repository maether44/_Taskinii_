import { Alert } from 'react-native';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

/**
 * Show a confirmation dialog before performing a destructive action.
 * Returns a Promise that resolves to true (confirmed) or false (cancelled).
 */
export function confirmAction(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(opts.title ?? 'Are you sure?', opts.message, [
      { text: opts.cancelText ?? 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      {
        text: opts.confirmText ?? 'Delete',
        style: opts.destructive !== false ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
