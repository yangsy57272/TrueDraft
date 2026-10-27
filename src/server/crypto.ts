import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Application-level AES-256-GCM encryption for essay drafts, versions, feedback, and notes.
 *
 * ENCRYPTION_KEYS is a comma-separated list of `keyId:base64Key` pairs. The first key encrypts
 * new data; all listed keys can decrypt, which allows key rotation without downtime.
 * Ciphertext format: `v1.<keyId>.<iv>.<tag>.<ciphertext>` (base64url segments).
 */

type Keyring = { primaryId: string; keys: Map<string, Buffer> };

let cached: Keyring | null = null;

function loadKeyring(): Keyring {
  if (cached) return cached;
  const raw = process.env.ENCRYPTION_KEYS?.trim();
  if (!raw) {
    throw new Error("ENCRYPTION_KEYS is not configured");
  }
  const keys = new Map<string, Buffer>();
  let primaryId = "";
  for (const entry of raw.split(",")) {
    const [id, b64] = entry.trim().split(":");
    if (!id || !b64 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error("ENCRYPTION_KEYS entries must look like keyId:base64Key");
    }
    const key = Buffer.from(b64, "base64");
    if (key.length !== 32) {
      throw new Error(`Encryption key "${id}" must decode to 32 bytes`);
    }
    keys.set(id, key);
    if (!primaryId) primaryId = id;
  }
  cached = { primaryId, keys };
  return cached;
}

/** For tests that swap keys at runtime. */
export function resetKeyringCache() {
  cached = null;
}

export type EncryptionPurpose =
  | "essay_draft"
  | "essay_context"
  | "essay_version"
  | "feedback_result"
  | "feedback_request"
  | "brainstorm_note";

export function encryptText(plaintext: string, purpose: EncryptionPurpose): string {
  const { primaryId, keys } = loadKeyring();
  const key = keys.get(primaryId)!;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(purpose));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", primaryId, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptText(payload: string, purpose: EncryptionPurpose): string {
  const parts = payload.split(".");
  if (parts.length !== 5 || parts[0] !== "v1") {
    throw new Error("Unrecognised ciphertext format");
  }
  const [, keyId, ivB64, tagB64, ctB64] = parts;
  const key = loadKeyring().keys.get(keyId);
  if (!key) throw new Error("Unknown encryption key id");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
  decipher.setAAD(Buffer.from(purpose));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64url")), decipher.final()]).toString("utf8");
}

export function encryptJson(value: unknown, purpose: EncryptionPurpose): string {
  return encryptText(JSON.stringify(value), purpose);
}

export function decryptJson<T = unknown>(payload: string, purpose: EncryptionPurpose): T {
  return JSON.parse(decryptText(payload, purpose)) as T;
}
