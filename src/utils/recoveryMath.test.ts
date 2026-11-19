import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMiniSparkline,
  buildSplineSvgPaths,
  CHART_AXIS_TICKS,
  classifyChartGestureIntent,
  computeElapsedBreakdown,
  dayToNormalizedX,
  DEFAULT_CHART_GEOMETRY,
  formatRussianDayLabel,
  getMatchedVoices,
  interpolateAspectValue,
  mapPointToSvg,
  normalizedXToDay,
  pluralizeRu,
  resolveActiveContext,
  resolveLiveStageIndex,
  resolveStageFromHours,
  resolveStageProgressInfo,
  wrapDeckIndex
} from './recoveryMath';
import { ASPECTS_DATA } from '../data/aspectsData';
import { CIRCADIAN_24H_DATA, RADAR_AXES_DATA } from '../data/circadianRadarData';
import { STAGES_DATA } from '../data/stagesData';
import { SYNERGY_PILLARS_DATA } from '../data/synergyProtocolData';
import { VOICES_DATA } from '../data/voicesData';

test('all 9 biomarker systems produce valid yDomain-aware sparklines and 9 distinct chart variants', () => {
  assert.equal(ASPECTS_DATA.length, 9, 'Expected 9 biomarker systems');
  const variants = new Set(ASPECTS_DATA.map((a) => a.chartVariant));
  assert.equal(variants.size, 9, 'Every system must have a unique chartVariant');

  for (const aspect of ASPECTS_DATA) {
    const spark0 = buildMiniSparkline(aspect.points, 0, 84, 24, aspect.yDomain);
    const spark90 = buildMiniSparkline(aspect.points, 90, 84, 24, aspect.yDomain);
    const baseSpark = buildMiniSparkline(aspect.baselinePoints, 3.5, 84, 24, aspect.yDomain);
    assert.ok(spark0.strokePath.startsWith('M '));
    assert.ok(baseSpark.strokePath.startsWith('M '));
    assert.ok(!spark0.strokePath.includes('NaN'));
    assert.ok(!baseSpark.strokePath.includes('NaN'));
    assert.ok(spark0.dotX >= 3 && spark0.dotX <= 81);
    assert.ok(spark90.dotX >= 3 && spark90.dotX <= 81);
    assert.ok(spark0.dotY >= 4 && spark0.dotY <= 20);
  }

  assert.equal(RADAR_AXES_DATA.length, 6);
  assert.ok(CIRCADIAN_24H_DATA.length >= 8);
  assert.equal(SYNERGY_PILLARS_DATA.length, 4);
  assert.equal(wrapDeckIndex(0, 4), 0);
  assert.equal(wrapDeckIndex(-1, 4), 3);
});

test('strict gesture intent filter protects vertical scrolling and engages only on deliberate horizontal drags', () => {
  assert.equal(classifyChartGestureIntent(4, 5), 'pending');
  assert.equal(classifyChartGestureIntent(10, 0), 'pending');
  assert.equal(classifyChartGestureIntent(4, 18), 'scroll-vertical');
  assert.equal(classifyChartGestureIntent(16, 14), 'scroll-vertical');
  assert.equal(classifyChartGestureIntent(20, 12), 'scroll-vertical');
  assert.equal(classifyChartGestureIntent(26, 4), 'scrub-horizontal');
  assert.equal(classifyChartGestureIntent(-30, 8), 'scrub-horizontal');
});

test('computeElapsedBreakdown accurately calculates elapsedHours, days, hours, minutes, seconds and clamps future timestamps', () => {
  const start = 1_700_000_000_000;
  const elapsedMs = (5 * 3600 + 12 * 60 + 33) * 1000;
  const res5h = computeElapsedBreakdown(start, start + elapsedMs);

  assert.equal(res5h.days, 0);
  assert.equal(res5h.hours, 5);
  assert.equal(res5h.minutes, 12);
  assert.equal(res5h.seconds, 33);
  assert.equal(res5h.formattedTwoDigitHours, '05');
  assert.equal(res5h.formattedTwoDigitMinutes, '12');
  assert.equal(res5h.formattedTwoDigitSeconds, '33');
  assert.ok(res5h.elapsedHours > 5.2 && res5h.elapsedHours < 5.22);

  const futureClamp = computeElapsedBreakdown(start + 50000, start);
  assert.equal(futureClamp.totalSeconds, 0);
  assert.equal(futureClamp.elapsedHours, 0);
  assert.equal(futureClamp.elapsedDays, 0);
});

test('19 contiguous [minHours, maxHours) CNS stages partition [0, Infinity) with ZERO gaps and fix the 5+ hour bug', () => {
  assert.equal(STAGES_DATA.length, 19, 'Expected exact 19 contiguous CNS stages');
  assert.equal(STAGES_DATA[0].minHours, 0);
  assert.equal(STAGES_DATA[STAGES_DATA.length - 1].maxHours, Infinity);

  for (let i = 0; i < STAGES_DATA.length - 1; i++) {
    assert.equal(
      STAGES_DATA[i].maxHours,
      STAGES_DATA[i + 1].minHours,
      `Zero-gap hour boundary expected between ${STAGES_DATA[i].id} and ${STAGES_DATA[i + 1].id}`
    );
    assert.ok(
      Math.abs(STAGES_DATA[i].minDays - STAGES_DATA[i].minHours / 24) < 1e-9
    );
    assert.ok(
      Math.abs(STAGES_DATA[i].maxDays - STAGES_DATA[i].maxHours / 24) < 1e-9
    );
    assert.ok(
      STAGES_DATA[i].representativeDay * 24 >= STAGES_DATA[i].minHours &&
        STAGES_DATA[i].representativeDay * 24 < STAGES_DATA[i].maxHours,
      `Representative day out of range for ${STAGES_DATA[i].id}`
    );
  }

  // Exact regression check for the 05:12:33 (5.209h) bug!
  assert.equal(resolveLiveStageIndex(0), 0);
  assert.equal(resolveLiveStageIndex(3.99), 0);
  assert.equal(resolveLiveStageIndex(4.0), 1);
  assert.equal(resolveLiveStageIndex(5.209), 1);
  assert.equal(resolveStageFromHours(5.209).id, 'stage-4-8h');
  assert.equal(resolveStageFromHours(5.209).shortLabel, 'Час 4–8');
  assert.equal(resolveLiveStageIndex(8.0), 2);
  assert.equal(resolveStageFromHours(8.0).id, 'stage-8-14h');
  assert.equal(resolveStageFromHours(14.0).id, 'stage-14-24h');
  assert.equal(resolveStageFromHours(24.0).id, 'stage-2d');
  assert.equal(resolveStageFromHours(48.0).id, 'stage-3d');
  assert.equal(resolveStageFromHours(72.0).id, 'stage-4d');
  assert.equal(resolveStageFromHours(96.0).id, 'stage-5d');
  assert.equal(resolveStageFromHours(120.0).id, 'stage-6d');
  assert.equal(resolveStageFromHours(144.0).id, 'stage-7d');
  assert.equal(resolveStageFromHours(168.0).id, 'stage-8-9d');
  assert.equal(resolveStageFromHours(216.0).id, 'stage-10-11d');
  assert.equal(resolveStageFromHours(264.0).id, 'stage-12-14d');
  assert.equal(resolveStageFromHours(336.0).id, 'stage-15-16d');
  assert.equal(resolveStageFromHours(384.0).id, 'stage-17-19d');
  assert.equal(resolveStageFromHours(456.0).id, 'stage-20-24d');
  assert.equal(resolveStageFromHours(576.0).id, 'stage-25-35d');
  assert.equal(resolveStageFromHours(840.0).id, 'stage-36-65d');
  assert.equal(resolveStageFromHours(1560.0).id, 'stage-66-90d');
  assert.equal(resolveStageFromHours(2400.0).id, 'stage-66-90d');

  // Verify live stage progress bar at 5h 12m (5.2 hours) inside Час 4–8
  const prog5h12m = resolveStageProgressInfo(1, 5.2);
  assert.equal(prog5h12m.progressPct, 30);
  assert.equal(
    prog5h12m.statusText,
    'Пройдено 30% этапа · До «Час 8–14» осталось 2ч 48м'
  );
  assert.equal(prog5h12m.isCurrentLive, true);

  // Verify resolveActiveContext with null (LIVE) and previewStageIndex (0..18)
  const liveAt5h = resolveActiveContext(null, 5.2 / 24);
  assert.equal(liveAt5h.isLive, true);
  assert.equal(liveAt5h.liveStageIndex, 1);
  assert.equal(liveAt5h.activeStageIndex, 1);
  assert.equal(liveAt5h.activeStage.id, 'stage-4-8h');

  const previewStage13 = resolveActiveContext(12, 5.2 / 24);
  assert.equal(previewStage13.isLive, false);
  assert.equal(previewStage13.liveStageIndex, 1);
  assert.equal(previewStage13.activeStageIndex, 12);
  assert.equal(previewStage13.activeStage.id, 'stage-12-14d');
  assert.equal(previewStage13.effectiveDay, 13.0);
});

test('dayToNormalizedX and normalizedXToDay are continuous, monotonic, and match discrete milestones', () => {
  assert.deepEqual(
    CHART_AXIS_TICKS.map((t) => t.label),
    ['Старт', '3д', '6д', '14д', '21д', '30д', '90д']
  );

  const sampleDays = [0, 0.5, 3, 6, 10, 14, 18, 21, 30, 60, 90];
  let prevNorm = -1;
  for (const d of sampleDays) {
    const norm = dayToNormalizedX(d);
    assert.ok(norm > prevNorm, `Expected strictly increasing norm at day ${d}`);
    prevNorm = norm;
    const roundTrip = normalizedXToDay(norm);
    assert.ok(Math.abs(roundTrip - d) < 1e-6);
  }
});

test('system 01 downregulates 300% -> 100% and system 02 holds 82% clarity shield vs 24% crash on Day 3.5', () => {
  const downreg = ASPECTS_DATA.find((a) => a.id === 'alpha4beta2-downregulation');
  assert.ok(downreg);
  assert.equal(interpolateAspectValue(downreg.points, 0, downreg.yDomain), 300);
  assert.equal(interpolateAspectValue(downreg.points, 21, downreg.yDomain), 100);
  assert.ok(
    interpolateAspectValue(downreg.points, 14, downreg.yDomain) <
      interpolateAspectValue(downreg.baselinePoints, 14, downreg.yDomain),
    'Protocol must clear excess receptors faster than unassisted baseline'
  );

  const clarity = ASPECTS_DATA.find((a) => a.id === 'alpha4beta2-clarity');
  assert.ok(clarity);
  const dipBase = interpolateAspectValue(clarity.baselinePoints, 3.5, clarity.yDomain);
  const protocolDay35 = interpolateAspectValue(clarity.points, 3.5, clarity.yDomain);
  const protocolDay14 = interpolateAspectValue(clarity.points, 14, clarity.yDomain);
  assert.ok(protocolDay35 >= 80 && dipBase <= 26);
  assert.ok(protocolDay14 >= 96);

  for (const aspect of ASPECTS_DATA) {
    const { strokePath, areaPath } = buildSplineSvgPaths(
      aspect.points,
      DEFAULT_CHART_GEOMETRY,
      aspect.yDomain
    );
    assert.ok(strokePath.startsWith('M ') && !strokePath.includes('NaN'));
    assert.ok(areaPath.endsWith('Z'));
    const leftEdge = mapPointToSvg(
      0,
      aspect.points[0].value,
      DEFAULT_CHART_GEOMETRY,
      aspect.yDomain
    );
    assert.equal(leftEdge.x, DEFAULT_CHART_GEOMETRY.padLeft);
  }
});

test('voicesData preserves all existing stories + 6 early-hour stories (171 total) and matches >= 6 stories across all 19 stages', () => {
  assert.equal(VOICES_DATA.length, 171);
  const protocolVoices = VOICES_DATA.filter((v) => v.isProtocolStory);
  assert.equal(protocolVoices.length, 54);

  assert.equal(VOICES_DATA[0].id, 'voice-12h-1');
  assert.equal(VOICES_DATA[26].id, 'voice-60-90d-3');

  for (const stage of STAGES_DATA) {
    const matched = getMatchedVoices(VOICES_DATA, stage.id, stage.representativeDay);
    assert.ok(
      matched.primary.length >= 6,
      `Expected >= 6 matched voices for ${stage.id}, got ${matched.primary.length}`
    );
  }

  assert.equal(pluralizeRu(1, ['день', 'дня', 'дней']), 'день');
  assert.equal(pluralizeRu(4, ['день', 'дня', 'дней']), 'дня');
  assert.equal(formatRussianDayLabel(0), 'Старт · 0ч');
  assert.equal(formatRussianDayLabel(3.5), 'День 3,5');
});

test('protocol data enforces pre-meal Ceriton, post-meal Noopept, Acetyl-CoA sweet tea/milk synergy and zero sugar-ban claims', () => {
  const pillar01 = SYNERGY_PILLARS_DATA.find((p) => p.num === '01');
  const pillar02 = SYNERGY_PILLARS_DATA.find((p) => p.num === '02');
  const pillar04 = SYNERGY_PILLARS_DATA.find((p) => p.num === '04');
  assert.ok(pillar01 && pillar02 && pillar04);
  assert.ok(pillar01.regimenFormula.includes('за 20 минут ДО еды'));
  assert.ok(pillar02.regimenFormula.includes('СРАЗУ ПОСЛЕ еды'));
  assert.ok(pillar04.biochemicalMechanism.includes('ChAT'));
  assert.ok(pillar04.biochemicalMechanism.includes('Ацетил-КоА'));

  const serializedCorpus = JSON.stringify({
    SYNERGY_PILLARS_DATA,
    ASPECTS_DATA,
    STAGES_DATA,
    CIRCADIAN_24H_DATA,
    VOICES_DATA
  });

  const forbiddenPattern =
    /без сахара|отказ от сахара|ноль сахара|0% сахара|zero.?sugar|исключени[ея] сладкого|запрет сахара/i;
  const match = serializedCorpus.match(forbiddenPattern);
  assert.equal(match, null, `Found outdated sugar-ban phrase: ${match?.[0] ?? ''}`);
});
