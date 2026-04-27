import { Alert } from 'react-native';
import { error as logError } from './logger';

type ErrorOptions = {
  /** Title shown in the alert dialog (default: "Error") */
  title?: string;
  /** If true, show nothing to the user — just log. Default: false */
  silent?: boolean;
  /** Override the user-facing message instead of extracting from the error */
  fallbackMessage?: string;
};

function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Something went wrong. Please try again.';
}

/**
 * Single entry point for handling errors across the app.
 * - Always logs in dev mode via logger.ts
 * - Shows an Alert to the user unless `silent` is set
 */
export function handleError(err: unknown, context: string, opts?: ErrorOptions) {
  const message = opts?.fallbackMessage ?? extractMessage(err);
  logError(`[${context}]`, err);

  if (!opts?.silent) {
    Alert.alert(opts?.title ?? 'Error', message);
  }
}
