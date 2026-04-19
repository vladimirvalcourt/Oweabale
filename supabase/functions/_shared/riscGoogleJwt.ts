/**
 * Google Cross-Account Protection (RISC): verify inbound security event JWTs
 * and mint short-lived bearer tokens for the RISC Management API.
 */
import { compactVerify, decodeProtectedHeader, importJWK, SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.9.6';

const RISC_CONFIG_URL = 'https://accounts.google.com/.well-known/risc-configuration';

type RiscDiscovery = { issuer: string; jwks_uri: string };

let discoveryCache: { cfg: RiscDiscovery; exp: number } | null = null;
const DISCOVERY_TTL_MS = 3600_000;

export async function fetchRiscDiscovery(): Promise<RiscDiscovery> {
  const now = Date.now();
  if (discoveryCache && discoveryCache.exp > now) return discoveryCache.cfg;
  const res = await fetch(RISC_CONFIG_URL);
  if (!res.ok) throw new Error(`risc discovery ${res.status}`);
  const cfg = (await res.json()) as RiscDiscovery;
  if (!cfg?.issuer || !cfg?.jwks_uri) throw new Error('invalid risc discovery');
  discoveryCache = { cfg, exp: now + DISCOVERY_TTL_MS };
  return cfg;
}

type GoogleJwks = { keys: Array<Record<string, unknown>> };

async function jwkForKid(jwksUri: string, kid: string): Promise<JsonWebKey> {
  const res = await fetch(jwksUri);
  if (!res.ok) throw new Error(`jwks ${res.status}`);
  const doc = (await res.json()) as GoogleJwks;
  const jwk = doc.keys?.find((k) => k.kid === kid);
  if (!jwk) throw new Error('jwks kid not found');
  return jwk as JsonWebKey;
}

export type VerifiedRiscEventJwt = {
  jti: string;
  /** JWT claims `events` map (event type URI -> payload object). */
  events: Record<string, Record<string, unknown>>;
};

export async function verifyGoogleRiscSecurityEventJwt(
  compactJwt: string,
  allowedOAuthClientIds: string[],
): Promise<VerifiedRiscEventJwt> {
  const cfg = await fetchRiscDiscovery();
  const header = decodeProtectedHeader(compactJwt);
  const kid = header.kid;
  if (!kid) throw new Error('missing kid');
  const jwk = await jwkForKid(cfg.jwks_uri, kid);
  const alg = (typeof header.alg === 'string' && header.alg) || 'RS256';
  const key = await importJWK(jwk, alg);
  const { payload: raw } = await compactVerify(compactJwt, key);
  const claims = JSON.parse(new TextDecoder().decode(raw)) as Record<string, unknown>;

  const iss = claims.iss;
  if (typeof iss !== 'string' || iss !== cfg.issuer) {
    throw new Error('invalid iss');
  }
  const aud = claims.aud;
  const audList = Array.isArray(aud) ? aud : typeof aud === 'string' ? [aud] : [];
  if (!audList.some((a) => allowedOAuthClientIds.includes(a))) {
    throw new Error('invalid aud');
  }
  const jti = claims.jti;
  if (typeof jti !== 'string' || !jti.trim()) throw new Error('missing jti');

  const events = claims.events;
  if (!events || typeof events !== 'object' || Array.isArray(events)) {
    throw new Error('missing events');
  }

  return { jti: jti.trim(), events: events as Record<string, Record<string, unknown>> };
}

export type GoogleServiceAccountJson = {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
};

export async function mintRiscManagementBearerToken(sa: GoogleServiceAccountJson): Promise<string> {
  const key = await importPKCS8(sa.private_key, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const kid = sa.private_key_id?.trim();
  if (!kid) throw new Error('service account missing private_key_id');
  return await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience('https://risc.googleapis.com/google.identity.risc.v1beta.RiscManagementService')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);
}

export const RISC_EVENT_TYPES = [
  'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked',
  'https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked',
  'https://schemas.openid.net/secevent/oauth/event-type/token-revoked',
  'https://schemas.openid.net/secevent/risc/event-type/account-disabled',
  'https://schemas.openid.net/secevent/risc/event-type/account-enabled',
  'https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required',
  'https://schemas.openid.net/secevent/risc/event-type/verification',
] as const;
