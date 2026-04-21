import { Platform } from 'react-native';

function getWearConnectivity() {
  if (Platform.OS !== 'android') return null;
  try { return require('react-native-wear-connectivity'); } catch { return null; }
}

/**
 * sendData — push health metrics to a paired Wear OS watch.
 *
 * Keys must match the Kotlin watch app's DataMap expectations exactly:
 *   steps    — integer step count for today
 *   calories — kcal burned today
 *   target   — daily step goal
 *
 * Non-fatal: if the watch is unreachable the error is logged and swallowed.
 */
async function sendData({ steps, calories, target }) {
  const wc = getWearConnectivity();
  if (!wc) return;

  const { sendMessage } = wc;

  const payload = {
    path: '/bodyq/metrics',
    steps,
    calories,
    target,
    ts: Date.now(),
  };

  await new Promise(resolve => {
    sendMessage(payload, resolve, resolve);
  });

  console.log('[wearSyncService] sent →', payload.path, `steps=${steps} cal=${calories} target=${target}`);
}

export const wearSyncService = { sendData };
