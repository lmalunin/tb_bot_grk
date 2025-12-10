import { useEffect, useState } from "react";
import {
  sendMessage,
  getUsers,
  getBackendURL,
  getUserFromStartParam,
} from "./api";
import "./App.scss";

const tg = (window as any).Telegram?.WebApp;

function App() {
  const [initData, setInitData] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [backendURL, setBackendURL] = useState("");
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    console.log("🚀 App mounted");

    if (tg) {
      console.log("✅ Telegram WebApp object found");
      tg.ready();
      tg.expand();

      // Получаем initDataUnsafe
      const initDataUnsafe = tg.initDataUnsafe || {};
      console.log("🔍 Telegram WebApp initDataUnsafe:", initDataUnsafe);
      console.log("🔍 Telegram WebApp initData:", tg.initData);
      console.log("🔍 Telegram WebApp version:", tg.version);
      console.log("🔍 Telegram WebApp platform:", tg.platform);

      // Получаем start_param из URL (важнее чем из Telegram)
      const urlParams = new URLSearchParams(window.location.search);
      const startParamFromURL = urlParams.get("tgWebAppStartParam");
      console.log("🔍 tgWebAppStartParam from URL:", startParamFromURL);

      // Проверяем весь URL
      console.log("🔍 Current URL:", window.location.href);
      console.log(
        "🔍 All URL params:",
        Object.fromEntries(urlParams.entries())
      );

      // Получаем backend URL
      const backend = getBackendURL();
      setBackendURL(backend);
      console.log("🔧 Final backend URL:", backend);

      // Получаем user_id из start_param
      const userIdFromStartParam = getUserFromStartParam();
      console.log("👤 User ID from start_param:", userIdFromStartParam);

      // Устанавливаем user_id (приоритет: start_param > initDataUnsafe)
      let finalUserId = userIdFromStartParam;
      if (!finalUserId && initDataUnsafe.user?.id) {
        finalUserId = initDataUnsafe.user.id;
        console.log("👤 User ID from initDataUnsafe:", finalUserId);
      }

      if (finalUserId) {
        setUserId(finalUserId);
      }

      // Собираем полные данные пользователя
      const userData = {
        user: {
          id: finalUserId || 0,
          first_name: initDataUnsafe.user?.first_name || "Пользователь",
          ...initDataUnsafe.user,
        },
        ...initDataUnsafe,
      };

      setInitData(userData);

      console.log("📊 Final user data:", userData);
    } else {
      console.log("⚠️ Not in Telegram environment");
      // Для тестирования вне Telegram
      const backend = getBackendURL();
      setBackendURL(backend);
    }

    // Загружаем пользователей для отладки
    getUsers()
      .then(setUsers)
      .catch((err) => {
        console.error("❌ Failed to load users:", err);
      });
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim()) {
      setStatus("error");
      setStatusMessage("Введите текст сообщения");
      return;
    }

    // Используем userId из state или initData
    const currentUserId = userId || initData.user?.id;

    if (!currentUserId) {
      setStatus("error");
      setStatusMessage(
        "Не удалось определить ваш ID. Перезапустите приложение через бота командой /start."
      );
      console.error("❌ User ID not found:", { userId, initData });
      return;
    }

    console.log("🚀 Sending message with data:", {
      text: messageText,
      userId: currentUserId,
      backendURL: backendURL,
    });

    setStatus("sending");
    setStatusMessage("Отправка...");

    try {
      const result = await sendMessage(messageText, currentUserId);
      console.log("✅ Message sent successfully:", result);
      setStatus("sent");
      setStatusMessage("✅ Сообщение отправлено в Telegram!");
      setMessageText("");
    } catch (error: any) {
      console.error("❌ Error sending message:", error);
      setStatus("error");
      setStatusMessage(`❌ Ошибка: ${error.message}`);
    }
  };

  return (
    <div className="app-container">
      <header className="hero">
        <h1>👋 Привет, {initData.user?.first_name || "друг"}!</h1>
        <p className="subtitle">
          <strong>Ваш ID:</strong> {userId || initData.user?.id || "неизвестен"}
        </p>
        <p className="subtitle">
          <strong>Backend URL:</strong>{" "}
          {backendURL ? (
            <code style={{ wordBreak: "break-all" }}>{backendURL}</code>
          ) : (
            "не установлен"
          )}
        </p>
      </header>

      <div className="card">
        <h2>📨 Отправить сообщение в Telegram</h2>
        <p className="hint">
          Сообщение будет отправлено боту, который перешлёт его вам в Telegram.
        </p>
        <form onSubmit={handleSendMessage}>
          <div className="field">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Введите текст сообщения..."
              rows={4}
              disabled={status === "sending"}
            />
          </div>
          <button
            type="submit"
            className="submit"
            disabled={!messageText.trim() || status === "sending"}
          >
            {status === "sending" ? "⏳ Отправляем..." : "📤 Отправить"}
          </button>
          {statusMessage && (
            <div className={`status status-${status}`}>
              {status === "sending" ? "⏳ " : ""}
              {status === "sent" ? "✅ " : ""}
              {status === "error" ? "❌ " : ""}
              {statusMessage}
            </div>
          )}
        </form>
      </div>

      <div className="card">
        <h2>📊 Пользователи в базе данных ({users.length})</h2>
        <div className="users-list">
          {users.length === 0 ? (
            <p>Нет пользователей</p>
          ) : (
            <pre>{JSON.stringify(users, null, 2)}</pre>
          )}
        </div>
      </div>

      <div className="debug-info">
        <details>
          <summary>🔧 Отладочная информация (нажмите чтобы развернуть)</summary>
          <div className="debug-content">
            <h3>Telegram WebApp данные:</h3>
            <pre>
              {JSON.stringify(
                {
                  initDataUnsafe: initData,
                  hasTelegram: !!tg,
                  version: tg?.version,
                  platform: tg?.platform,
                  themeParams: tg?.themeParams,
                },
                null,
                2
              )}
            </pre>

            <h3>URL параметры:</h3>
            <pre>
              {JSON.stringify(
                Object.fromEntries(
                  new URLSearchParams(window.location.search).entries()
                ),
                null,
                2
              )}
            </pre>

            <h3>Информация о пользователе:</h3>
            <pre>
              {JSON.stringify(
                {
                  userIdFromState: userId,
                  userIdFromInitData: initData.user?.id,
                  userName: initData.user?.first_name,
                },
                null,
                2
              )}
            </pre>

            <h3>Backend информация:</h3>
            <pre>
              {JSON.stringify(
                {
                  backendURL: backendURL,
                  canSend: !!(userId || initData.user?.id),
                },
                null,
                2
              )}
            </pre>
          </div>
        </details>
      </div>
    </div>
  );
}

export default App;
