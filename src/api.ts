import axios from "axios";

export type ClientConfig = {
  backend?: string;
  user_id?: number;
};

export function decodeStartParam(value?: string | null): ClientConfig {
  if (!value) {
    console.warn("⚠️ No start_param provided");
    return {};
  }

  console.log("🔍 Raw start_param value:", value);

  try {
    // Пробуем декодировать base64 (Web Safe Base64)
    // Заменяем URL-безопасные символы обратно
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");

    // Добавляем padding если нужно
    const padding = base64.length % 4;
    const paddedBase64 = padding ? base64 + "=".repeat(4 - padding) : base64;

    console.log("🔍 Base64 after fixing:", paddedBase64);

    // Декодируем base64
    const decodedString = atob(paddedBase64);
    console.log("🔍 Decoded string:", decodedString);

    try {
      // Пробуем распарсить как JSON
      const parsed = JSON.parse(decodedString);
      console.log("🔍 Parsed JSON:", parsed);

      const config: ClientConfig = {};

      // Получаем backend URL
      if (typeof parsed.backend === "string") {
        config.backend = parsed.backend;
      } else if (typeof parsed.b === "string") {
        config.backend = parsed.b;
      }

      // Получаем user_id
      if (typeof parsed.user_id === "number") {
        config.user_id = parsed.user_id;
      } else if (typeof parsed.uid === "number") {
        config.user_id = parsed.uid;
      } else if (typeof parsed.u === "number") {
        config.user_id = parsed.u;
      }

      console.log("🔍 Final config:", config);
      return config;
    } catch (jsonError) {
      console.log("🔍 Not JSON, treating as plain URL:", decodedString);
      // Если не JSON, считаем что это просто URL
      if (decodedString.startsWith("http")) {
        return { backend: decodedString };
      }
      return {};
    }
  } catch (error) {
    console.error("❌ Failed to decode start_param:", error);
    return {};
  }
}

export function getBackendURL(): string {
  const tg = (window as any).Telegram?.WebApp;

  // Сначала пробуем из start_param (из Telegram или URL)
  const startParamFromTG = tg?.initDataUnsafe?.start_param;
  const startParamFromURL = new URLSearchParams(window.location.search).get(
    "tgWebAppStartParam"
  );
  const startParam = startParamFromTG || startParamFromURL;

  console.log("🔍 Start param sources:", {
    fromTG: startParamFromTG,
    fromURL: startParamFromURL,
    using: startParam,
  });

  if (startParam) {
    const config = decodeStartParam(startParam);
    console.log("🔍 Config from decodeStartParam:", config);

    if (config.backend) {
      console.log("🔧 Using backend from start_param:", config.backend);
      return config.backend;
    }
  }

  // Fallback для разработки
  const fallback = "http://localhost:8080";
  console.log("⚠️ Using fallback backend URL:", fallback);
  return fallback;
}

export function getUserFromStartParam() {
  const tg = (window as any).Telegram?.WebApp;
  const startParamFromTG = tg?.initDataUnsafe?.start_param;
  const startParamFromURL = new URLSearchParams(window.location.search).get(
    "tgWebAppStartParam"
  );
  const startParam = startParamFromTG || startParamFromURL;

  if (!startParam) return null;

  const config = decodeStartParam(startParam);
  return config.user_id || null;
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
