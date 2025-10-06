/**
 * API client for VogPlus.ai backend
 */

// Use empty string to use Vite proxy in development
const API_BASE_URL = "";

// DEPRECATED: Use useAuth().user.id instead
// Kept for backwards compatibility during migration
export const CURRENT_USER_ID = 1;

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface Membership {
  id: number;
  name: string;
  provider_slug: string;
  provider_name?: string;
  plan_name?: string;
  created_at: string;
}

export interface Benefit {
  id: number;
  membership_id: number;
  title: string;
  description?: string;
  vendor_domain?: string;
  category?: string;
  source_url?: string;
  expires_at?: string;
}

export interface UserMembership {
  id: number;
  user_id: number;
  membership_id: number;
  notes?: string;
}

export interface Recommendation {
  title: string;
  rationale: string;
  estimated_saving?: string;
  estimated_saving_min?: number;
  estimated_saving_max?: number;
  action_url?: string;
  membership?: string;
  membership_slug?: string;
  benefit_id?: number;
  benefit_match_ids?: number[];
  kind?: "overlap" | "unused" | "switch" | "bundle" | "tip";
}

export interface CheckResponse {
  vendor: string;
  user_id: number;
  has_benefits: boolean;
  benefits: Benefit[];
  recommendations: Recommendation[];
}

export interface LLMRecommendationIn {
  user_id: number;
  context?: {
    domain?: string;
    category?: string;
    candidate_membership_slug?: string;
  };
}

export interface LLMRecommendationOut {
  recommendations: Recommendation[];
  relevant_benefits: Benefit[];
}

export interface SmartAddAlternative {
  membership_slug: string;
  reason: string;
}

export interface SmartAddIn {
  user_id: number;
  candidate_membership_slug: string;
}

export interface SmartAddOut {
  status: string;
  decision: "add" | "already_covered" | "better_alternative";
  explanation: string;
  alternatives: SmartAddAlternative[];
  impacted_benefits: Benefit[];
}

export interface DiscoverMembershipRequest {
  user_id: number;
  name: string;
}

export interface BenefitPreview {
  id?: number;
  title: string;
  description?: string;
  category?: string;
  vendor_domain?: string;
  source_url?: string;
  validation_status?: string;
}

export interface MembershipPreview {
  id: number;
  name: string;
  provider_slug: string;
  provider_name?: string;
  plan_name?: string;
  status: string;
  is_catalog: boolean;
}

export interface DiscoverMembershipResponse {
  membership: MembershipPreview;
  benefits_preview: BenefitPreview[];
}

export interface ValidateMembershipRequest {
  user_id: number;
  name: string;
}

export interface ValidateMembershipResponse {
  status: "valid" | "invalid" | "ambiguous" | "exists";
  normalized_name?: string;
  provider?: string;
  plan?: string;
  confidence: number;
  reason: string;
  suggestions: string[];
  existing_membership?: {
    id: number;
    name: string;
    provider_slug: string;
    is_catalog: boolean;
    status: string;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Get auth token from localStorage (Zustand persist)
    const authData = localStorage.getItem("vogplus-auth");
    const accessToken = authData
      ? JSON.parse(authData).state?.accessToken
      : null;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        ...options?.headers,
      },
    });

    // Handle 401 Unauthorized - token expired
    if (response.status === 401 && accessToken) {
      // Try to refresh the token
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry the request with new token
        return this.request(endpoint, options);
      } else {
        // Refresh failed, redirect to login
        window.location.href = "/login";
        throw new Error("Session expired");
      }
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const authData = localStorage.getItem("vogplus-auth");
      const refreshToken = authData
        ? JSON.parse(authData).state?.refreshToken
        : null;

      if (!refreshToken) return false;

      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();

        // Update tokens in localStorage
        const auth = JSON.parse(localStorage.getItem("vogplus-auth") || "{}");
        auth.state = {
          ...auth.state,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
        };
        localStorage.setItem("vogplus-auth", JSON.stringify(auth));

        return true;
      }

      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  }

  // Users
  async createUser(email: string): Promise<User> {
    return this.request<User>("/api/users", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async getUserBenefits(userId: number): Promise<Benefit[]> {
    return this.request<Benefit[]>(`/api/users/${userId}/benefits`);
  }

  // Memberships
  async getMemberships(): Promise<Membership[]> {
    return this.request<Membership[]>("/api/memberships");
  }

  // User Memberships
  async addUserMembership(
    userId: number,
    membershipId: number,
    notes?: string
  ): Promise<UserMembership> {
    return this.request<UserMembership>("/api/user-memberships", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        membership_id: membershipId,
        notes,
      }),
    });
  }

  async removeUserMembership(
    userId: number,
    membershipId: number
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/user-memberships/${userId}/${membershipId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
  }

  // Recommendations
  async getRecommendations(
    userId: number,
    domain?: string
  ): Promise<Recommendation[]> {
    const params = new URLSearchParams({ user_id: userId.toString() });
    if (domain) {
      params.append("domain", domain);
    }
    return this.request<Recommendation[]>(`/api/recommendations?${params}`);
  }

  // Check
  async checkBenefits(vendor: string, userId: number): Promise<CheckResponse> {
    const params = new URLSearchParams({
      vendor,
      user_id: userId.toString(),
    });
    return this.request<CheckResponse>(`/api/check?${params}`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>("/healthz");
  }

  // LLM endpoints
  async getLLMRecommendations(
    payload: LLMRecommendationIn
  ): Promise<LLMRecommendationOut> {
    return this.request<LLMRecommendationOut>("/api/llm/recommendations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async smartAddCheck(payload: SmartAddIn): Promise<SmartAddOut> {
    return this.request<SmartAddOut>("/api/llm/smart-add", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Get benefit details by ID
  async getBenefit(benefitId: number): Promise<Benefit> {
    return this.request<Benefit>(`/api/benefits/${benefitId}`);
  }

  // Get multiple benefits by IDs
  async getBenefits(benefitIds: number[]): Promise<Benefit[]> {
    const params = new URLSearchParams();
    benefitIds.forEach((id) => params.append("ids", id.toString()));
    return this.request<Benefit[]>(`/api/benefits?${params}`);
  }

  // Validate membership name before discovery
  async validateMembershipName(
    payload: ValidateMembershipRequest
  ): Promise<ValidateMembershipResponse> {
    return this.request<ValidateMembershipResponse>(
      "/api/memberships/validate-name",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  // Discover a new membership
  async discoverMembership(
    payload: DiscoverMembershipRequest
  ): Promise<DiscoverMembershipResponse> {
    return this.request<DiscoverMembershipResponse>(
      "/api/memberships/discover",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }
}

export const api = new ApiClient(API_BASE_URL);
