import crypto from "crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(bytes = 20): string {
  const buf = crypto.randomBytes(bytes);
  let bits = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += BASE32[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

function base32ToBuf(secret: string): Buffer {
  const clean = secret.replace(/=+$/, "").toUpperCase();
  let bits = "";
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function totpCode(secret: string, at = Date.now(), step = 30): string {
  const counter = Math.floor(at / 1000 / step);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac("sha1", base32ToBuf(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(bin % 1_000_000).padStart(6, "0");
}

export function verifyTotp(secret: string, code: string, window = 1): boolean {
  const expected = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(expected) || !secret) return false;
  const now = Date.now();
  for (let i = -window; i <= window; i++) {
    if (totpCode(secret, now + i * 30_000) === expected) return true;
  }
  return false;
}

export function otpauthUrl(secret: string, account: string, issuer = "AquaFlow"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
