import "server-only";
import { existsSync } from "node:fs";
import maxmind, { type CityResponse, type Reader } from "maxmind";

// IP -> country / region / city using a local MMDB file (DB-IP "IP to City Lite",
// free, CC BY 4.0 — https://db-ip.com). Lookups happen in memory on our own
// server; the IP itself is never stored.
const DB_PATH = process.env.GEOIP_DB_PATH ?? "/var/lib/geoip/dbip-city-lite.mmdb";

let reader: Promise<Reader<CityResponse> | null> | null = null;

function getReader() {
  reader ??= existsSync(DB_PATH)
    ? maxmind.open<CityResponse>(DB_PATH).catch(() => null)
    : Promise.resolve(null);
  return reader;
}

export interface GeoInfo {
  country: string | null;
  region: string | null;
  city: string | null;
}

export async function lookupGeo(ip: string | null): Promise<GeoInfo> {
  const empty = { country: null, region: null, city: null };
  if (!ip || !maxmind.validate(ip)) return empty;
  const db = await getReader();
  const hit = db?.get(ip);
  if (!hit) return empty;
  return {
    country: hit.country?.iso_code ?? null,
    region: hit.subdivisions?.[0]?.names?.en ?? null,
    city: hit.city?.names?.en ?? null,
  };
}
