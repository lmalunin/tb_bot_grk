import axios from "axios";

export type ClientConfig = {
  backend?: string;
};

const BASE64_URL_PATTERN = /-/g;
const BASE64_URL_SLASH_PATTERN = /_/g;

function decodeBase64Url(value: string): string {
  const normalized = value
    .replace(BASE64_URL_PATTERN, "+")
    .replace(BASE64_URL_SLASH_PATTERN, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(paddingLength);
  return atob(padded);
}

export function decodeStartParam(value?: string | null): ClientConfig {
  if (!value) {
    console.warn("⚠️ No start_param provided");
    return {};
  }

  try {
    console.log("🔍 Decoding start_param:", value);
    const decoded = decodeBase64Url(value);
    console.log("🔍 Decoded string:", decoded);

    try {
      const raw = JSON.parse(decoded) as ClientConfig | string;
      if (typeof raw === "string") {
        console.log("🔍 start_param is plain string (backend URL):", raw);
        return { backend: raw };
      }
      if (typeof raw?.backend === "string") {
        console.log("🔍 start_param contains backend:", raw.backend);
        return { backend: raw.backend };
      }
      if ("b" in (raw as Record<string, unknown>)) {
        const backendValue = (raw as Record<string, unknown>).b;
        if (typeof backendValue === "string") {
          console.log("🔍 start_param contains 'b' field:", backendValue);
          return { backend: backendValue };
        }
      }
      console.log("🔍 start_param JSON parsed but no backend found:", raw);
    } catch {
      console.log("🔍 start_param is not JSON, treating as string:", decoded);
      return { backend: decoded };
    }
  } catch (error) {
    console.error("❌ Failed to decode start_param:", error);
  }

  return {};
}

export function getBackendURL(): string {
  const tg = (window as any).Telegram?.WebApp;
  const startParam =
    tg?.initDataUnsafe?.start_param ||
    new URLSearchParams(window.location.search).get("tgWebAppStartParam");

  console.log(
    "🔍 Raw start_param from Telegram:",
    tg?.initDataUnsafe?.start_param
  );
  console.log(
    "🔍 Raw start_param from URL:",
    new URLSearchParams(window.location.search).get("tgWebAppStartParam")
  );

  const config = decodeStartParam(startParam);
  const backend = config.backend || "http://localhost:8080";

  console.log("🔧 Using backend URL:", backend);
  return backend;
}

export async function sendMessage(text: string, userId: number) {
  const url = `${getBackendURL()}/api/message`;
  console.log("🚀 Sending message to:", url);
  console.log("📤 Payload:", { text, user_id: userId });

  try {
    const res = await axios.post(
      url,
      {
        text,
        user_id: userId,
      },
      {
        timeout: 10000,
      }
    );
    console.log("✅ Server response:", res.data);
    return res.data;
  } catch (e: any) {
    console.error("❌ Failed to send message", e);
    if (e.response) {
      console.error("❌ Server error response:", e.response.data);
      console.error("❌ Server status:", e.response.status);
    }
    throw new Error(e.response?.data?.message || e.message || "Network error");
  }
}

export async function getUsers() {
  const url = `${getBackendURL()}/api/users`;
  console.log("📥 Fetching users from:", url);

  try {
    const res = await axios.get(url, { timeout: 10000 });
    console.log("✅ Users fetched:", res.data.length);
    return res.data;
  } catch (e) {
    console.error("❌ Failed to fetch users", e);
    if (axios.isAxiosError(e)) {
      console.error("❌ Axios error details:", {
        message: e.message,
        code: e.code,
        response: e.response?.data,
        status: e.response?.status,
      });
    }
    return [];
  }
}
