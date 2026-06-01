import type { AIRecommendation } from './mlRecommendation.service';
import type { POI } from '../data/mockPois';

export type RoiLabel = 'Low ROI' | 'Moderate ROI' | 'High ROI' | 'Excellent ROI';

export interface RoiEstimate {
  estimatedInstallationCostUsd: number;
  estimatedAnnualSavingsUsd: number;
  estimatedPaybackYears: number;
  estimatedCo2ReductionKgPerYear: number;
  estimatedSystemCapacityKwp: number;
  estimatedPanelCount: number;
  roiLabel: RoiLabel;
}

type RoiCandidate = POI &
  AIRecommendation & {
    annualEnergyKwh: number;
    recommendedPanelCount: number;
    estimatedCapacityKw: number;
  };

const ELECTRICITY_VALUE_USD_PER_KWH = 0.18;
const CO2_REDUCTION_KG_PER_KWH = 0.45;

const getInstalledCostPerKwp = (candidate: RoiCandidate) => {
  if (['building', 'public_building'].includes(candidate.type)) 
    return 950;
  if (candidate.type === 'parking') 
    return 1200;
  if (['road', 'highway', 'road_shoulder', 'transport_corridor'].includes(candidate.type)) 
    return 1400;
  if (['open_space', 'paved_area', 'park'].includes(candidate.type)) 
    return 1100;
  return 1150;
};

const getRiskMultiplier = (candidate: RoiCandidate) => {
  if (candidate.decisionStatus === 'Not Recommended') 
    return 1.22;
  if (candidate.riskLevel === 'High') 
    return 1.18;
  if (candidate.riskLevel === 'Medium') 
    return 1.08;
  return 1;
};

const getRoiLabel = (paybackYears: number): RoiLabel => {
  if (paybackYears <= 5.5) 
    return 'Excellent ROI';
  if (paybackYears <= 8) 
    return 'High ROI';
  if (paybackYears <= 11) 
    return 'Moderate ROI';
  return 'Low ROI';
};

export const estimateRoi = (candidate: RoiCandidate): RoiEstimate => {
  const estimatedPanelCount = candidate.recommendedPanelCount;
  const estimatedSystemCapacityKwp = Math.max(
    candidate.estimatedCapacityKw,
    Number((estimatedPanelCount * 0.45).toFixed(1))
  );
  const installationCost = estimatedSystemCapacityKwp * getInstalledCostPerKwp(candidate) * getRiskMultiplier(candidate);
  const estimatedAnnualSavingsUsd = candidate.annualEnergyKwh * ELECTRICITY_VALUE_USD_PER_KWH;
  const estimatedPaybackYears =
    estimatedAnnualSavingsUsd > 0 ? installationCost / estimatedAnnualSavingsUsd : 99;

  return {
    estimatedInstallationCostUsd: Math.round(installationCost),
    estimatedAnnualSavingsUsd: Math.round(estimatedAnnualSavingsUsd),
    estimatedPaybackYears: Number(Math.min(99, estimatedPaybackYears).toFixed(1)),
    estimatedCo2ReductionKgPerYear: Math.round(candidate.annualEnergyKwh * CO2_REDUCTION_KG_PER_KWH),
    estimatedSystemCapacityKwp,
    estimatedPanelCount,
    roiLabel: getRoiLabel(estimatedPaybackYears),
  };
};

export const applyRoiEstimates = <TCandidate extends RoiCandidate>(
  candidates: TCandidate[]
): Array<TCandidate & RoiEstimate> => candidates.map((candidate) => ({ ...candidate, ...estimateRoi(candidate) }));

export const getRoiPlanningNote = () => {
  return 'ROI values are planning estimates and should be validated by an engineering survey.';
};