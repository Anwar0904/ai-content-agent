import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getServerEnv } from "@/lib/env";

function getEncryptionKey() {
  const value = getServerEnv().META_TOKEN_ENCRYPTION_KEY;
  if (!value) throw new Error("META_TOKEN_ENCRYPTION_KEY is not configured.");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64") !== value) {
    throw new Error("META_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return key;
}

export function encryptToken(token: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), nonce);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return ["v1", nonce.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptToken(value: string) {
  const [version, encodedNonce, encodedTag, encodedCiphertext, ...extra] = value.split(".");
  if (version !== "v1" || !encodedNonce || !encodedTag || !encodedCiphertext || extra.length) {
    throw new Error("Stored Meta credentials could not be decrypted.");
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(encodedNonce, "base64url"));
    decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encodedCiphertext, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Stored Meta credentials could not be decrypted.");
  }
}