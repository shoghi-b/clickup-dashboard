import {
  ClickUpTeamResponse,
  ClickUpTimeEntriesResponse,
  ClickUpApiErrorResponse,
  RateLimitInfo,
} from './types';

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export class ClickUpApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'ClickUpApiError';
  }
}

export class ClickUpClient {
  private apiToken: string;
  private rateLimitInfo: RateLimitInfo | null = null;

  constructor(apiToken?: string) {
    this.apiToken = apiToken || process.env.CLICKUP_API_TOKEN || '';
    if (!this.apiToken) {
      throw new Error('ClickUp API token is required');
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async handleRateLimit(): Promise<void> {
    if (!this.rateLimitInfo) return;

    if (this.rateLimitInfo.remaining === 0) {
      const now = Date.now();
      const resetTime = this.rateLimitInfo.reset * 1000;
      const waitTime = Math.max(0, resetTime - now);

      if (waitTime > 0) {
        console.log(`Rate limit reached. Waiting ${waitTime}ms until reset...`);
        await this.sleep(waitTime + 1000); // Add 1 second buffer
      }
    }
  }

  private updateRateLimitInfo(headers: Headers): void {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
      };
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    await this.handleRateLimit();

    const url = `${CLICKUP_API_BASE}${endpoint}`;
    const headers = {
      Authorization: this.apiToken,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      this.updateRateLimitInfo(response.headers);

      if (!response.ok) {
        // Handle rate limiting with retry
        if (response.status === 429 && retryCount < MAX_RETRIES) {
          const retryAfter = response.headers.get('retry-after');
          const waitTime = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : RETRY_DELAY * Math.pow(2, retryCount);

          console.log(`Rate limited. Retrying after ${waitTime}ms...`);
          await this.sleep(waitTime);
          return this.request<T>(endpoint, options, retryCount + 1);
        }

        // Handle other errors
        const errorData: ClickUpApiErrorResponse = await response.json().catch(() => ({
          err: response.statusText,
          ECODE: 'UNKNOWN',
        }));

        throw new ClickUpApiError(
          errorData.err || 'ClickUp API request failed',
          response.status,
          errorData.ECODE
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ClickUpApiError) {
        throw error;
      }

      // Network errors - retry with exponential backoff
      if (retryCount < MAX_RETRIES) {
        const waitTime = RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`Network error. Retrying after ${waitTime}ms...`);
        await this.sleep(waitTime);
        return this.request<T>(endpoint, options, retryCount + 1);
      }

      throw new ClickUpApiError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getTeamMembers(teamId: string): Promise<ClickUpTeamResponse> {
    return this.request<ClickUpTeamResponse>(`/team/${teamId}`);
  }

  async getTimeEntries(params: {
    teamId: string;
    startDate?: number; // Unix timestamp in milliseconds
    endDate?: number; // Unix timestamp in milliseconds
    assignee?: number; // User ID
  }): Promise<ClickUpTimeEntriesResponse> {
    const queryParams = new URLSearchParams();

    if (params.startDate) {
      queryParams.append('start_date', params.startDate.toString());
    }
    if (params.endDate) {
      queryParams.append('end_date', params.endDate.toString());
    }
    if (params.assignee) {
      queryParams.append('assignee', params.assignee.toString());
    }

    const endpoint = `/team/${params.teamId}/time_entries?${queryParams.toString()}`;
    return this.request<ClickUpTimeEntriesResponse>(endpoint);
  }

  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }
}

