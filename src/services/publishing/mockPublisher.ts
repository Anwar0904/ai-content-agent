import type { SocialPlatform } from "@/constants/statuses";

export interface MockPublishRequest {
  videoId: string;
  socialAccountId: string;
  platform: SocialPlatform;
  accountId?: string;
  accountName?: string;
  caption?: string;
  title?: string;
  videoPath?: string | null;
}

export type MockPublishResult =
  | {
      success: true;
      platform: SocialPlatform;
      externalPostId: string;
      publishedAt: Date;
    }
  | {
      success: false;
      platform: SocialPlatform;
      error: string;
    };

export interface SocialPublisher {
  publish(request: MockPublishRequest): Promise<MockPublishResult>;
}

export class MockFacebookPublisher implements SocialPublisher {
  async publish(request: MockPublishRequest): Promise<MockPublishResult> {
    const accountId = (request.accountId ?? "").toLowerCase();
    if (accountId.includes("fail") || (request.accountName ?? "").toLowerCase().includes("fail")) {
      return {
        success: false,
        platform: "facebook",
        error: "Mock Facebook publishing failed.",
      };
    }

    return {
      success: true,
      platform: "facebook",
      externalPostId: `mock_fb_${request.videoId.slice(-8)}`,
      publishedAt: new Date(),
    };
  }
}

export class MockInstagramPublisher implements SocialPublisher {
  async publish(request: MockPublishRequest): Promise<MockPublishResult> {
    const accountId = (request.accountId ?? "").toLowerCase();
    if (accountId.includes("fail") || (request.accountName ?? "").toLowerCase().includes("fail")) {
      return {
        success: false,
        platform: "instagram",
        error: "Mock Instagram publishing failed.",
      };
    }

    return {
      success: true,
      platform: "instagram",
      externalPostId: `mock_ig_${request.videoId.slice(-8)}`,
      publishedAt: new Date(),
    };
  }
}

export function getMockPublisher(platform: SocialPlatform): SocialPublisher {
  return platform === "facebook" ? new MockFacebookPublisher() : new MockInstagramPublisher();
}
