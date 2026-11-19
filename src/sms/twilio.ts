/**
 * Minimal Twilio REST client for the Roofline subaccount. Credentials come from
 * TWILIO_ACCOUNT_SID / TWILIO_API_KEY / TWILIO_API_SECRET (set on Render, never logged).
 */
function creds() {
  const sid = process.env.TWILIO_ACCOUNT_SID, key = process.env.TWILIO_API_KEY, secret = process.env.TWILIO_API_SECRET;
  if (!sid || !key || !secret) throw new Error("Twilio is not configured");
  return { sid, auth: "Basic " + Buffer.from(`${key}:${secret}`).toString("base64") };
}

export async function twilio<T = any>(method: "GET" | "POST" | "DELETE", path: string, params: Record<string, string> = {}): Promise<T> {
  const { sid, auth } = creds();
  const qs = new URLSearchParams(params).toString();
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}${path}${method === "GET" && qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    method, headers: { Authorization: auth, ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body: method === "POST" ? qs : undefined,
  });
  const body: any = res.status === 204 ? {} : await res.json();
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${body?.message}`);
  return body as T;
}

export async function searchNumbers(areaCode: string, limit = 5) {
  const d = await twilio("GET", "/AvailablePhoneNumbers/US/Local.json",
    { AreaCode: areaCode, SmsEnabled: "true", VoiceEnabled: "true", PageSize: String(limit) });
  return (d.available_phone_numbers ?? []).map((n: any) => ({ number: n.phone_number, display: n.friendly_name, city: n.locality, state: n.region }));
}

/** Buy a number. Only called with explicit owner approval (it costs money). */
export async function buyNumber(e164: string, friendlyName: string) {
  const d = await twilio("POST", "/IncomingPhoneNumbers.json", { PhoneNumber: e164, FriendlyName: friendlyName });
  return { sid: d.sid, number: d.phone_number };
}

export async function listOwnedNumbers() {
  const d = await twilio("GET", "/IncomingPhoneNumbers.json", { PageSize: "20" });
  return (d.incoming_phone_numbers ?? []).map((n: any) => ({ sid: n.sid, number: n.phone_number, name: n.friendly_name }));
}

export async function sendSms(to: string, body: string, from = process.env.TWILIO_FROM_NUMBER) {
  if (!from) throw new Error("TWILIO_FROM_NUMBER not set");
  const d = await twilio("POST", "/Messages.json", { To: to, From: from, Body: body });
  return { sid: d.sid as string, status: d.status as string };
}

export async function messageStatus(sid: string) {
  const d = await twilio("GET", `/Messages/${sid}.json`);
  return { status: d.status, errorCode: d.error_code, errorMessage: d.error_message };
}
