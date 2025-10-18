export interface Recommendation {
  title: string;
  rationale: string;
  estimated_saving_min?: number;
  estimated_saving_max?: number;
  action_url?: string;
  kind?: string;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  relevant_benefits: number[];
}

