import { useEffect, useState } from "react";
import { sendMessage, getUsers, decodeStartParam, getBackendURL } from "./api";
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

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      const initDataUnsafe = tg.initDataUnsafe || {};
      setInitData(initDataUnsafe);

      // Логируем ВСЁ содержимое initDataUnsafe
      console.log("🔍 Telegram WebApp initDataUnsafe:", initDataUnsafe);
      console.log("🔍 Telegram WebApp initData:", tg.initData);
      console.log("🔍 Telegram WebApp version:", tg.version);
      console.log("🔍 Telegram WebApp platform:", tg.platform);

      // Логируем start_param для отладки
      const startParam =
        initDataUnsafe?.start_param ||
        new URLSearchParams(window.location.search).get("tgWebAppStartParam");
      console.log("🔍 start_param:", startParam);

      const decoded = decodeStartParam(startParam);
      console.log("🔍 decoded start_param:", decoded);

      // Получаем backendURL
      const backend = getBackendURL();
      setBackendURL(backend);
      console.log("🔧 Backend URL для отправки:", backend);
    }

    // Загружаем пользователей
    getUsers().then(setUsers);
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim()) {
      setStatus("error");
      setStatusMessage("Введите текст сообщения");
      return;
    }

    if (!initData.user?.id) {
      setStatus("error");
      setStatusMessage(
        "Не удалось определить ваш ID. Перезапустите приложение."
      );
      console.error("❌ User ID не найден в initData:", initData);
      return;
    }

    console.log("🚀 Отправка сообщения:", {
      text: messageText,
      userId: initData.user.id,
      backendURL: backendURL,
    });

    setStatus("sending");
    setStatusMessage("");

    try {
      const result = await sendMessage(messageText, initData.user.id);
      console.log("✅ Результат отправки:", result);
      setStatus("sent");
      setStatusMessage("Сообщение отправлено в Telegram!");
      setMessageText("");
    } catch (error: any) {
      console.error("❌ Ошибка отправки:", error);
      setStatus("error");
      setStatusMessage(error.message || "Ошибка отправки. Проверьте консоль.");
    }
  };

  return (
    <div className="app-container">
      <header className="hero">
        <h1>👋 Привет, {initData.user?.first_name || "друг"}!</h1>
        <p className="subtitle">Ваш ID: {initData.user?.id || "неизвестен"}</p>
        <p className="subtitle">
          Backend URL: <code>{backendURL}</code>
        </p>
      </header>

      <div className="card">
        <h2>📨 Отправить сообщение в Telegram</h2>
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
            {status === "sending" ? "Отправляем..." : "Отправить"}
          </button>
          {statusMessage && (
            <div className={`status status-${status}`}>{statusMessage}</div>
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
          <summary>🔧 Отладочная информация (initDataUnsafe)</summary>
          <div>
            <h3>initDataUnsafe:</h3>
            <pre>{JSON.stringify(initData, null, 2)}</pre>
            <h3>Backend URL:</h3>
            <pre>{backendURL}</pre>
            <h3>URL Parameters:</h3>
            <pre>
              {JSON.stringify(
                Object.fromEntries(
                  new URLSearchParams(window.location.search).entries()
                ),
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
