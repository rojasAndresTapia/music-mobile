/**
 * Logs how many seconds it takes from "track finished" to "next track started".
 * Useful for debugging gaps between songs (e.g. background throttling, network).
 */

export function startTrackTransition(fromTrack: string): number {
  const start = Date.now();
  console.log('⏱️ [TRANSITION] Started timer', { fromTrack });
  return start;
}

export function logTrackTransitionDuration(
  startTime: number,
  toTrack: string,
  context?: { appState?: string; source?: string }
): void {
  const elapsedMs = Date.now() - startTime;
  const elapsedSec = (elapsedMs / 1000).toFixed(2);
  const parts = [`${elapsedSec}s`, `→ "${toTrack}"`];
  if (context?.appState) parts.push(`(${context.appState})`);
  if (context?.source) parts.push(`[${context.source}]`);
  console.log(`⏱️ [TRANSITION] ${parts.join(' ')}`);
}
