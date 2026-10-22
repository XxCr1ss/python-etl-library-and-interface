// Browser request boundary only. No refresh token is sent to the ETL backend.
let tokenReader: (() => Promise<string | null>) | null = null;
let epoch = 0;
export const authEpoch = () => epoch;
export function setTokenReader(reader: (() => Promise<string | null>) | null) { tokenReader = reader; }
export function invalidateAuthRequests() { epoch++; }
export async function accessToken() { return tokenReader ? tokenReader() : null; }
