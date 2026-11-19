export type AuraPhase = 'acute' | 'peak' | 'clean';

export type AppTabId = 'core' | 'biochem' | 'voices';

export type CoreViewMode = 'stage' | 'protocol';

export type BiochemViewMode = 'systems' | 'radar24h';

export type SynergyPillarId =
  | 'pillar-choline'
  | 'pillar-noopept'
  | 'pillar-steps'
  | 'pillar-insulin';

export type CoreSheetTopic =
  | 'summary'
  | 'receptors'
  | 'dopamine'
  | 'vascular'
  | 'sleep'
  | 'myth'
  | SynergyPillarId;

export type StageId =
  | 'stage-0-4h'
  | 'stage-4-8h'
  | 'stage-8-14h'
  | 'stage-14-24h'
  | 'stage-2d'
  | 'stage-3d'
  | 'stage-4d'
  | 'stage-5d'
  | 'stage-6d'
  | 'stage-7d'
  | 'stage-8-9d'
  | 'stage-10-11d'
  | 'stage-12-14d'
  | 'stage-15-16d'
  | 'stage-17-19d'
  | 'stage-20-24d'
  | 'stage-25-35d'
  | 'stage-36-65d'
  | 'stage-66-90d';

export type LegacyVoiceStageId =
  | 'stage-1-4h'
  | 'stage-8-12h'
  | 'stage-12h'
  | 'stage-1d'
  | 'stage-24h'
  | 'stage-2d'
  | 'stage-3-4d'
  | 'stage-5-7d'
  | 'stage-10-14d'
  | 'stage-21d'
  | 'stage-30d'
  | 'stage-45-60d'
  | 'stage-60-90d'
  | 'stage-90d';

export type TimeMachineMode = 'live' | StageId;

export interface NeuroMetric {
  label: string;
  value: string;
  detail: string;
}

export interface StageBentoTeasers {
  receptors: string;
  dopamine: string;
  vascular: string;
  sleep: string;
}

export interface SynergyPillar {
  id: SynergyPillarId;
  num: string;
  shortPillLabel: string;
  bentoTitle: string;
  bentoTeaser: string;
  accentHex: string;
  iconName: 'brain' | 'zap' | 'activity' | 'shield';
  sheetKicker: string;
  sheetTitle: string;
  regimenFormula: string;
  biochemicalMechanism: string;
  neuroVascularSynergy: string;
  physiologicalMarkers: string[];
  peerReviewedCitations: string;
}

export interface RecoveryStage {
  id: StageId;
  shortLabel: string;
  tag: string;
  pillLabel: string;
  rangeLabel: string;
  title: string;
  subtitle: string;
  minHours: number;
  maxHours: number;
  minDays: number;
  maxDays: number;
  representativeDay: number;
  auraPhase: AuraPhase;
  leadSummary: string;
  receptorState: string;
  dopamineAndHpa: string;
  vascularAndCellular: string;
  sleepAndCognition: string;
  visceralReality: string;
  saturationTruthNote: string;
  keyMetrics: NeuroMetric[];
  bentoTeasers: StageBentoTeasers;
}

export interface StageProgressInfo {
  progressPct: number;
  statusText: string;
  isCurrentLive: boolean;
  isCompleted: boolean;
  isFuture: boolean;
}

export interface AspectPoint {
  day: number;
  value: number;
}

export interface AspectMilestoneNote {
  minDay: number;
  maxDay: number;
  stateLabel: string;
  biochemicalNote: string;
}

export type AspectIconName =
  | 'shield'
  | 'flame'
  | 'activity'
  | 'zap'
  | 'brain'
  | 'moon'
  | 'layers'
  | 'heart-pulse'
  | 'sparkles';

export type AspectChartVariant =
  | 'inverted-downregulation'
  | 'dual-spline-shield'
  | 'velocity-shear-bars'
  | 'diverging-dual-axis'
  | 'threshold-crossover'
  | 'stepped-atp-hybrid'
  | 'stacked-sleep-phases'
  | 'vascular-corridor-band'
  | 'stacked-synergy-contribution';

export interface RecoveryAspect {
  id: string;
  order: string;
  title: string;
  shortBentoLabel: string;
  shortTag: string;
  chartVariant: AspectChartVariant;
  chartTypeBadge: string;
  iconName: AspectIconName;
  accentHex: string;
  accentGlowRgba: string;
  accentSecondaryHex: string;
  unitLabel: string;
  yDomain: [number, number];
  invertDeltaGood?: boolean;
  targetThresholdValue?: number;
  targetThresholdLabel?: string;
  smokerBaselineLabel: string;
  keyMediatorLabel: string;
  baselineNote: string;
  scientificLead: string;
  mechanismDeepDive: string;
  clinicalReference: string;
  points: AspectPoint[];
  baselinePoints: AspectPoint[];
  secondarySeries?: AspectPoint[];
  tertiarySeries?: AspectPoint[];
  scrubberNotes: AspectMilestoneNote[];
}

export type VoiceSource =
  | 'r/stopsmoking'
  | 'r/QuitSmoking'
  | 'r/stopdrinking'
  | 'r/decaf'
  | 'r/BrainFog'
  | 'r/Biohackers'
  | 'r/Nootropics'
  | 'r/walking'
  | 'YouTube · Дневник отказа'
  | 'YouTube · Комментарии'
  | 'YouTube · Нейрохакинг отказа'
  | 'YouTube · 20 000 шагов без никотина';

export interface CommunityVoice {
  id: string;
  stageId: StageId | LegacyVoiceStageId;
  day: number;
  source: VoiceSource;
  authorHandle: string;
  smokerProfile: string;
  headline: string;
  quote: string;
  neuroAnalysisTitle: string;
  neuroAnalysis: string;
  isProtocolStory?: boolean;
}

export interface ElapsedTimeBreakdown {
  elapsedMs: number;
  totalSeconds: number;
  elapsedHours: number;
  elapsedDays: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formattedTwoDigitHours: string;
  formattedTwoDigitMinutes: string;
  formattedTwoDigitSeconds: string;
}
