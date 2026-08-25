import type { RecommendationCampaign, Coupon } from "../drizzle/schema";

export type RecommendationContext = {
  now: Date;
  userReference: string;
  tollPlazaId: number;
  consentPersonalization: boolean;
  usedCouponIds?: number[];
  preferredCategories?: string[];
};

export type RankedRecommendation = {
  campaignId: number;
  couponId: number;
  mode: RecommendationCampaign["mode"];
  score: number;
  explanation: string;
  sponsorshipLabel: string | null;
};

type Candidate = { campaign: RecommendationCampaign; coupon: Coupon };

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function campaignIsEligible(candidate: Candidate, context: RecommendationContext) {
  const { campaign, coupon } = candidate;
  const now = context.now;
  if (campaign.status !== "active") return false;
  if (now < new Date(campaign.startsAt) || now > new Date(campaign.endsAt)) return false;
  if (campaign.tollPlazaId !== null && campaign.tollPlazaId !== context.tollPlazaId) return false;
  if (coupon.status !== "active") return false;
  if (now < new Date(coupon.startsAt) || now > new Date(coupon.endsAt)) return false;
  if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) return false;
  if (campaign.mode === "personalized" && !context.consentPersonalization) return false;
  return true;
}

function relevanceScore(candidate: Candidate, context: RecommendationContext) {
  const category = candidate.coupon.title.toLocaleLowerCase();
  const preferred = (context.preferredCategories ?? []).some(item => category.includes(item.toLocaleLowerCase()));
  const affinity = preferred ? 0.85 : 0.55;
  const freshness = new Date(candidate.coupon.endsAt).getTime() - context.now.getTime();
  const urgency = freshness <= 48 * 60 * 60 * 1000 ? 0.95 : 0.55;
  const priorUsePenalty = context.usedCouponIds?.includes(candidate.coupon.id) ? 0.2 : 0;
  return clamp(affinity * 0.55 + urgency * 0.25 + 0.2 - priorUsePenalty);
}

function commercialBoost(candidate: Candidate) {
  if (candidate.campaign.mode !== "sponsored") return 0;
  const bidAmount = Number(candidate.campaign.bidAmount ?? 0);
  if (bidAmount <= 0) return 0;
  return clamp(Math.min(bidAmount / 100, 0.12), 0, 0.12);
}

function explanationFor(candidate: Candidate, context: RecommendationContext) {
  if (candidate.campaign.mode === "sponsored") return candidate.campaign.sponsorshipLabel?.trim() || "Oferta patrocinada nesta região";
  if (candidate.campaign.tollPlazaId === context.tollPlazaId) return "Disponível após sua passagem por este pedágio";
  if (candidate.campaign.mode === "personalized") return "Relacionado às suas preferências autorizadas";
  return "Benefício disponível na sua jornada";
}

export function rankRecommendationCandidates(candidates: Candidate[], context: RecommendationContext): RankedRecommendation[] {
  return candidates
    .filter(candidate => campaignIsEligible(candidate, context))
    .map(candidate => ({
      campaignId: candidate.campaign.id,
      couponId: candidate.coupon.id,
      mode: candidate.campaign.mode,
      score: clamp(relevanceScore(candidate, context) + commercialBoost(candidate)),
      explanation: explanationFor(candidate, context),
      sponsorshipLabel: candidate.campaign.mode === "sponsored" ? candidate.campaign.sponsorshipLabel : null,
    }))
    .sort((left, right) => right.score - left.score || left.campaignId - right.campaignId);
}

export function buildPassageIdempotencyKey(userReference: string, tollPlazaId: number, occurredAt: Date) {
  return `toll:${userReference}:${tollPlazaId}:${occurredAt.toISOString().slice(0, 16)}`;
}
