export const BEACON_HOLD_SECONDS = 4.6;
export const RECOVERY_LOCK_SECONDS = 6;

export type ExtractionHudStage = "hidden" | "beacon" | "recovery";

export type ExtractionHudState = {
  visible: boolean;
  stage: ExtractionHudStage;
  title: string;
  countdown: string;
  status: string;
  threats: string;
  percent: number;
  boundaryWarning: boolean;
  hasThreats: boolean;
};

export type ExtractionHudInput = {
  missionActive: boolean;
  descendantsRescued: boolean;
  beaconRaised: boolean;
  beaconChannelSeconds: number;
  inBeaconRadius: boolean;
  recoveryLockSeconds: number;
  inRecoveryRadius: boolean;
  counterPushStarted: boolean;
  activeHostileCount: number;
};

const HIDDEN_STATE: ExtractionHudState = {
  visible: false,
  stage: "hidden",
  title: "",
  countdown: "",
  status: "",
  threats: "",
  percent: 0,
  boundaryWarning: false,
  hasThreats: false,
};

function clampSeconds(value: number, maximum: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(maximum, value)) : 0;
}

function formatCountdown(seconds: number) {
  return `${Math.max(0, seconds).toFixed(1)}s`;
}

function threatText(count: number, counterPushStarted: boolean, beaconRaised: boolean) {
  if (count > 0) {
    const label = count === 1 ? "HOSTILE" : "HOSTILES";
    return `${beaconRaised ? "EXTRACTION CONTACT" : "COUNTER-PUSH"} · ${count} ${label}`;
  }
  if (beaconRaised) return "NO ACTIVE HOSTILES";
  return counterPushStarted ? "COUNTER-PUSH CLEARED" : "COUNTER-PUSH EXPECTED";
}

export function getExtractionHudState(input: ExtractionHudInput): ExtractionHudState {
  if (!input.missionActive || !input.descendantsRescued) return HIDDEN_STATE;

  const activeHostileCount = Number.isFinite(input.activeHostileCount)
    ? Math.max(0, Math.floor(input.activeHostileCount))
    : 0;
  const hasThreats = activeHostileCount > 0;
  const threats = threatText(activeHostileCount, input.counterPushStarted, input.beaconRaised);

  if (!input.beaconRaised) {
    const progress = clampSeconds(input.beaconChannelSeconds, BEACON_HOLD_SECONDS);
    const boundaryWarning = !input.inBeaconRadius && progress > 0.05;
    const visible = input.inBeaconRadius || boundaryWarning;
    if (!visible) return HIDDEN_STATE;

    return {
      visible: true,
      stage: "beacon",
      title: "BEACON CHANNEL",
      countdown: formatCountdown(BEACON_HOLD_SECONDS - progress),
      status: boundaryWarning
        ? "OUTSIDE BEACON RADIUS · CHARGE DECAYING"
        : progress > 0.05
          ? "HOLD E · KEEP THE SIGNAL LIVE"
          : "HOLD E TO RAISE THE BEACON",
      threats,
      percent: (progress / BEACON_HOLD_SECONDS) * 100,
      boundaryWarning,
      hasThreats,
    };
  }

  const progress = clampSeconds(input.recoveryLockSeconds, RECOVERY_LOCK_SECONDS);
  const boundaryWarning = !input.inRecoveryRadius && progress > 0.05;
  const visible = input.inRecoveryRadius || boundaryWarning;
  if (!visible) return HIDDEN_STATE;

  return {
    visible: true,
    stage: "recovery",
    title: "RECOVERY LOCK",
    countdown: formatCountdown(RECOVERY_LOCK_SECONDS - progress),
    status: boundaryWarning
      ? "OUTSIDE PAD RADIUS · LOCK PROGRESS DECAYING"
      : progress > 0.05
        ? "HOLD INSIDE THE RECOVERY PAD"
        : "HOLD INSIDE THE RECOVERY RING",
    threats,
    percent: (progress / RECOVERY_LOCK_SECONDS) * 100,
    boundaryWarning,
    hasThreats,
  };
}
