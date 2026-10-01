export interface MetaOAuthConnection {
  provider: "facebook";
  userAccessTokenEncrypted: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}