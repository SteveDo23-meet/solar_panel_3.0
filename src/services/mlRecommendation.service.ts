import type { POI, PoiType } from '../data/mockPois';
import { scoringConfig } from '../config/scoringConfig';
import type { ScoringConfig } from '../config/scoringConfig';

export type AISuitabilityLabel = 'Low' | 'Medium' | 'High' | 'Excellent';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type DecisionStatus = 'Recommended' | 'Conditional' | 'Not Recommended';

export interface AIRecommendation {
  aiSuitabilityScore: number;
  aiConfidence: number;
  aiSuitabilityLabel: AISuitabilityLabel;
  riskLevel: RiskLevel;
  recommendedAction: string;
  aiExplanation: string[];
  positiveFactors: string[];
  negativeFactors: string[];
  isRecommended: boolean;
  rejectionReason?: string;
  decisionStatus: DecisionStatus;
}

export type SolarCandidateWithAI<TCandidate extends POI = POI> = TCandidate & AIRecommendation;

type MLInputCandidate = POI & {
  score?: number;
  annualEnergyKwh?: number;
  recommendedPanelCount?: number;
  solarEfficiencyPercent?: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const getScoringMethodology = (): string => {
  return 'This system uses a configurable weighted multi-criteria decision-support model. The weights are stored in scoringConfig.ts and can be calibrated according to engineering surveys, municipal policy, or real solar production data.';
};

export const getAISuitabilityLabel = (score: number, config: ScoringConfig = scoringConfig): AISuitabilityLabel => {
  const { decisionThresholds } = config;

  if (score >= decisionThresholds.excellentMinScore) 
    return 'Excellent';
  if (score >= decisionThresholds.highMinScore) 
    return 'High';
  if (score >= decisionThresholds.mediumMinScore) 
    return 'Medium';
  return 'Low'; 
};

export const getRiskLevel = (candidate: MLInputCandidate, config: ScoringConfig = scoringConfig): RiskLevel => {
  const { areaThresholds, decisionThresholds, riskFactorWeights, riskSurfaceWeights, shadingThresholds } = config;
  const configuredRiskWeights: Partial<Record<PoiType, number>> & { default: number } = riskSurfaceWeights;
  const surfaceRisk = configuredRiskWeights[candidate.type] ?? configuredRiskWeights.default;
  const shadingRisk =
    candidate.shading > shadingThresholds.highShading
      ? riskFactorWeights.highShading
      : candidate.shading > shadingThresholds.mediumShading
        ? riskFactorWeights.mediumShading
        : 0;
  const areaRisk = candidate.area < areaThresholds.smallAreaRisk ? riskFactorWeights.smallArea : 0;
  const riskScore = surfaceRisk + shadingRisk + areaRisk;

  if (riskScore >= decisionThresholds.highRiskMinScore) 
    return 'High';
  if (riskScore >= decisionThresholds.mediumRiskMinScore) 
    return 'Medium';
  return 'Low';
};

const getDecisionStatus = (score: number, riskLevel: RiskLevel, config: ScoringConfig): DecisionStatus => {
  const { decisionThresholds } = config;

  if (score >= decisionThresholds.recommendedMinScore && riskLevel !== 'High') return 'Recommended';
  if (
    score >= decisionThresholds.conditionalMinScore &&
    score <= decisionThresholds.conditionalMaxScore &&
    riskLevel !== 'High'
  ) {
    return 'Conditional';
  }
  return 'Not Recommended';
};

const getRejectionReason = (candidate: MLInputCandidate, config: ScoringConfig): string => {
  const { areaThresholds, shadingThresholds, surfaceGroups } = config;

  if (candidate.type === 'park' && candidate.shading >= shadingThresholds.parkTreeConflict) {
    return 'High tree shading and public-use conflict reduce installation feasibility.';
  }

  if (surfaceGroups.transportRisk.includes(candidate.type) && candidate.area < areaThresholds.roadMinimumArea) {
    return 'Limited usable surface and high infrastructure risk.';
  }

  if (candidate.type === 'open_space' && candidate.area < areaThresholds.openSpaceMinimumArea) {
    return 'Insufficient area for meaningful solar output.';
  }

  if (candidate.shading >= shadingThresholds.rejectionShading) {
    return 'Shading risk is too high for efficient solar production.';
  }

  if (candidate.area < areaThresholds.minimumMeaningfulArea) {
    return 'Insufficient usable area for a meaningful solar installation.';
  }

  return 'Combined suitability score and implementation risk do not support recommendation.';
};

export const getRecommendedAction = (
  candidate: MLInputCandidate,
  score: number,
  riskLevel: RiskLevel,
  config: ScoringConfig = scoringConfig
): string => {
  const { decisionThresholds, qualityThresholds, surfaceGroups } = config;

  if (score >= decisionThresholds.excellentMinScore && riskLevel === 'Low') return 'Advance to feasibility and interconnection review';
  if (score < decisionThresholds.conditionalMinScore || riskLevel === 'High') return 'Do not prioritize; document rejection rationale';
  if (candidate.type === 'parking' && score >= qualityThresholds.parkingPriorityScore) return 'Prioritize canopy layout and ownership validation';
  if (surfaceGroups.roofInstallation.includes(candidate.type) && score >= qualityThresholds.buildingSurveyScore) {
    return 'Request roof survey and structural load check';
  }
  if (surfaceGroups.transportRisk.includes(candidate.type)) {
    return 'Validate right-of-way, setbacks, and safety constraints';
  }
  if (candidate.type === 'park') return 'Review public-use conflict and tree preservation constraints';
  if (score >= qualityThresholds.shortlistScore) return 'Keep in shortlist pending field validation';
  return 'Deprioritize until constraints improve';
};

const getPositiveFactors = (candidate: MLInputCandidate, config: ScoringConfig): string[] => {
  const { areaThresholds, qualityThresholds, roiThresholds, shadingThresholds, surfaceGroups } = config;
  const factors: string[] = [];

  if (candidate.solarExposure >= qualityThresholds.strongSolarExposure) factors.push('Strong solar exposure');
  if (candidate.area >= areaThresholds.largeUsableSurface) factors.push('Large usable surface');
  if (candidate.weatherConditions >= qualityThresholds.favorableWeather) factors.push('Favorable weather factor');
  if ((candidate.annualEnergyKwh ?? 0) >= roiThresholds.strongAnnualOutputKwh) factors.push('High annual output potential');
  if (surfaceGroups.practicalInstallation.includes(candidate.type)) {
    factors.push('Practical installation surface');
  }
  if (candidate.shading <= shadingThresholds.lowShading) factors.push('Low shading risk');

  return factors.slice(0, 4);
};

const getNegativeFactors = (candidate: MLInputCandidate, config: ScoringConfig): string[] => {
  const { areaThresholds, qualityThresholds, shadingThresholds, surfaceGroups } = config;
  const factors: string[] = [];

  if (candidate.shading >= shadingThresholds.elevatedShading) factors.push('Elevated shading risk');
  if (candidate.area < areaThresholds.limitedSurfaceArea) factors.push('Limited surface area');
  if (candidate.weatherConditions < qualityThresholds.lowWeatherReliability) factors.push('Lower weather reliability');
  if (candidate.type === 'park') factors.push('Public-use and tree conflict');
  if (surfaceGroups.transportRisk.includes(candidate.type)) {
    factors.push('Transport safety and access constraints');
  }
  if (candidate.surfaceType < qualityThresholds.surfaceReview) factors.push('Surface suitability requires review');

  return factors.slice(0, 4);
};

export const getAIExplanation = (
  candidate: MLInputCandidate,
  score: number,
  riskLevel: RiskLevel,
  config: ScoringConfig = scoringConfig
): string[] => {
  const { surfaceGroups } = config;
  const explanation = [
    getScoringMethodology(),
    `Suitability model ranks this candidate as ${getAISuitabilityLabel(score, config).toLowerCase()} based on surface, output, and risk signals.`,
    `Risk is ${riskLevel.toLowerCase()} due to shading, surface class, and implementation constraints.`,
  ];

  if (candidate.type === 'parking') explanation.push('Parking areas are favored for solar canopies and predictable ownership review.');
  if (surfaceGroups.roofInstallation.includes(candidate.type)) {
    explanation.push('Public roofs are favored when structural review is feasible.');
  }
  if (surfaceGroups.transportRisk.includes(candidate.type)) {
    explanation.push('Transport corridors retain energy potential but require safety and right-of-way validation.');
  }
  if (candidate.type === 'park') explanation.push('Park candidates are penalized for tree cover and public-space conflicts.');

  return explanation.slice(0, 4);
};

export const applyMLRecommendation = <TCandidate extends MLInputCandidate>(
  candidate: TCandidate,
  config: ScoringConfig = scoringConfig
): SolarCandidateWithAI<TCandidate> => {
  const { areaThresholds, confidenceWeights, featureWeights, scoreBounds, surfaceTypeWeights } = config;

  // This is an explainable configurable decision-support model, not a trained ML model.
  // The weights can be calibrated in future versions with engineering surveys or production data.
  const normalizedOutput = clamp(
    ((candidate.annualEnergyKwh ?? 0) / featureWeights.annualOutput.normalizationKwh) * featureWeights.annualOutput.maxContribution,
    0,
    featureWeights.annualOutput.maxContribution
  );
  const areaSignal = clamp(
    Math.log10(Math.max(candidate.area, featureWeights.area.minimumInputArea)) * featureWeights.area.logarithmicScale -
      featureWeights.area.logarithmicOffset,
    0,
    featureWeights.area.maxContribution
  );
  const scoreSignal = (candidate.score ?? 0) * featureWeights.baseSolarScore;
  const exposureSignal = candidate.solarExposure * featureWeights.solarExposure;
  const weatherSignal = candidate.weatherConditions * featureWeights.weatherConditions;
  const surfaceSignal = candidate.surfaceType * featureWeights.surfaceType;
  const shadingPenalty = candidate.shading * featureWeights.shadingPenalty;
  const typeSignal = surfaceTypeWeights[candidate.type];
  const riskLevel = getRiskLevel(candidate, config);
  const riskPenalty = riskLevel === 'High' ? featureWeights.highRiskPenalty : riskLevel === 'Medium' ? featureWeights.mediumRiskPenalty : 0;
  const aiSuitabilityScore = Math.round(
    clamp(
      exposureSignal + weatherSignal + surfaceSignal + scoreSignal + areaSignal + normalizedOutput + typeSignal - shadingPenalty - riskPenalty,
      scoreBounds.min,
      scoreBounds.max
    )
  );
  const decisionStatus = getDecisionStatus(aiSuitabilityScore, riskLevel, config);
  const rejectionReason = decisionStatus === 'Not Recommended' ? getRejectionReason(candidate, config) : undefined;
  const positiveFactors = getPositiveFactors(candidate, config);
  const negativeFactors = rejectionReason
    ? [rejectionReason, ...getNegativeFactors(candidate, config)].slice(0, 4)
    : getNegativeFactors(candidate, config);
  const confidenceBase =
    confidenceWeights.base +
    positiveFactors.length * confidenceWeights.positiveFactorBoost -
    negativeFactors.length * confidenceWeights.negativeFactorPenalty;
  const aiConfidence = Number(
    clamp(
      confidenceBase + (candidate.area > areaThresholds.confidenceAreaBonus ? confidenceWeights.areaConfidenceBoost : 0),
      confidenceWeights.min,
      confidenceWeights.max
    ).toFixed(2)
  );

  return {
    ...candidate,
    aiSuitabilityScore,
    aiConfidence,
    aiSuitabilityLabel: getAISuitabilityLabel(aiSuitabilityScore, config),
    riskLevel,
    recommendedAction: getRecommendedAction(candidate, aiSuitabilityScore, riskLevel, config),
    aiExplanation: getAIExplanation(candidate, aiSuitabilityScore, riskLevel, config),
    positiveFactors,
    negativeFactors,
    isRecommended: decisionStatus !== 'Not Recommended',
    rejectionReason,
    decisionStatus,
  };
};

export const applyMLRecommendations = <TCandidate extends MLInputCandidate>(
  candidates: TCandidate[],
  config: ScoringConfig = scoringConfig
): Array<SolarCandidateWithAI<TCandidate>> => {
  return candidates.map((candidate) => applyMLRecommendation(candidate, config));
};
