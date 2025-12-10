import axios from "axios";

export type ClientConfig = {
  backend?: string;
  user_id?: number;
};

// Глобальная переменная для callback логирования
let debugLogCallback: ((message: string) => void) | null = null;

export function setDebugLogCallback(callback: (message: string) => void) {
  debugLogCallback = callback;
}

function addDebugLog(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${message}`;

  if (debugLogCallback) {
    debugLogCallback(logMessage);
  } else {
    console.log(logMessage);
  }
}

export function decodeStartParam(value?: string | null): ClientConfig {
  if (!value) {
    addDebugLog("⚠️ No start_param provided");
    return {};
  }

  addDebugLog(`🔍 Raw start_param value: ${value}`);

  try {
    // Пробуем декодировать base64 (Web Safe Base64)
    // Заменяем URL-безопасные символы обратно
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");

    // Добавляем padding если нужно
    const padding = base64.length % 4;
    const paddedBase64 = padding ? base64 + "=".repeat(4 - padding) : base64;

    addDebugLog(`🔍 Base64 after fixing: ${paddedBase64}`);

    // Декодируем base64
    const decodedString = atob(paddedBase64);
    addDebugLog(`🔍 Decoded string: ${decodedString}`);

    try {
      // Пробуем распарсить как JSON
      const parsed = JSON.parse(decodedString);
      addDebugLog(`🔍 Parsed JSON: ${JSON.stringify(parsed)}`);

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

      addDebugLog(`🔍 Final config: ${JSON.stringify(config)}`);
      return config;
    } catch (jsonError) {
      addDebugLog(`🔍 Not JSON, treating as plain URL: ${decodedString}`);
      // Если не JSON, считаем что это просто URL
      if (decodedString.startsWith("http")) {
        return { backend: decodedString };
      }
      return {};
    }
  } catch (error) {
    addDebugLog(`❌ Failed to decode start_param: ${error}`);
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

  addDebugLog(
    `🔍 Start param sources: ${JSON.stringify({
      fromTG: startParamFromTG,
      fromURL: startParamFromURL,
      using: startParam,
    })}`
  );

  if (startParam) {
    const config = decodeStartParam(startParam);
    addDebugLog(`🔍 Config from decodeStartParam: ${JSON.stringify(config)}`);

    if (config.backend) {
      addDebugLog(`🔧 Using backend from start_param: ${config.backend}`);
      return config.backend;
    }
  }

  // Fallback для разработки
  const fallback = "http://localhost:8080";
  addDebugLog(`⚠️ Using fallback backend URL: ${fallback}`);
  return fallback;
}

export function getUserFromStartParam(): number | null {
  const tg = (window as any).Telegram?.WebApp;
  const startParamFromTG = tg?.initDataUnsafe?.start_param;
  const startParamFromURL = new URLSearchParams(window.location.search).get(
    "tgWebAppStartParam"
  );
  const startParam = startParamFromTG || startParamFromURL;

  if (!startParam) {
    addDebugLog("⚠️ No start_param found for user ID extraction");
    return null;
  }

  const config = decodeStartParam(startParam);
  const userId = config.user_id || null;
  addDebugLog(`🔍 Extracted user_id from start_param: ${userId}`);
  return userId;
}

export async function sendMessage(text: string, userId: number) {
  const url = `${getBackendURL()}/api/message`;
  addDebugLog(`🚀 Sending message to: ${url}`);
  addDebugLog(`📤 Payload: ${JSON.stringify({ text, user_id: userId })}`);

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
    addDebugLog(`✅ Server response: ${JSON.stringify(res.data)}`);
    return res.data;
  } catch (e: any) {
    addDebugLog(`❌ Failed to send message: ${e.message}`);
    if (e.response) {
      addDebugLog(
        `❌ Server error response: ${JSON.stringify(e.response.data)}`
      );
      addDebugLog(`❌ Server status: ${e.response.status}`);
    }
    throw new Error(e.response?.data?.message || e.message || "Network error");
  }
}

export async function getUsers(): Promise<any[]> {
  const url = `${getBackendURL()}/api/users`;
  addDebugLog(`📥 Fetching users from: ${url}`);

  try {
    const res = await axios.get(url, { timeout: 10000 });
    const users = res.data || [];
    addDebugLog(`✅ Users fetched: ${users.length} users`);

    if (users.length === 0) {
      addDebugLog("ℹ️ No users found in database");
    } else {
      users.forEach((user: any, index: number) => {
        addDebugLog(
          `👤 User ${index + 1}: ID=${user.id}, Username=${
            user.username
          }, FirstName=${user.first_name}`
        );
      });
    }

    return users;
  } catch (e: any) {
    addDebugLog(`❌ Failed to fetch users: ${e.message}`);
    if (axios.isAxiosError(e)) {
      addDebugLog(
        `❌ Axios error details: ${JSON.stringify({
          message: e.message,
          code: e.code,
          response: e.response?.data,
          status: e.response?.status,
        })}`
      );
    }
    return [];
  }
}
