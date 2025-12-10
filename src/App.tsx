import { useEffect, useState } from "react";
import {
  sendMessage,
  getUsers,
  getBackendURL,
  getUserFromStartParam,
  setDebugLogCallback,
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
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  // Функция для добавления логов
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setDebugLogs((prev) => [...prev.slice(-50), logMessage]); // Храним последние 50 логов
  };

  useEffect(() => {
    // Устанавливаем callback для логирования в api.ts
    setDebugLogCallback(addDebugLog);

    addDebugLog("🚀 App mounted");

    // ВАЖНО: Сначала получаем user_id из start_param (это главный источник)
    // getUserFromStartParam() проверяет и URL параметры, и Telegram WebApp
    const userIdFromStartParam = getUserFromStartParam();
    addDebugLog(`👤 getUserFromStartParam() returned: ${userIdFromStartParam}`);

    if (userIdFromStartParam) {
      setUserId(userIdFromStartParam);
      addDebugLog(`✅ Set userId state to: ${userIdFromStartParam}`);
    } else {
      addDebugLog("⚠️ getUserFromStartParam() returned null");
    }

    // Получаем backend URL
    const backend = getBackendURL();
    setBackendURL(backend);
    addDebugLog(`🔧 Final backend URL: ${backend}`);

    if (tg) {
      addDebugLog("✅ Telegram WebApp object found");
      tg.ready();
      tg.expand();

      const initDataUnsafe = tg.initDataUnsafe || {};
      addDebugLog(
        `🔍 Telegram WebApp initDataUnsafe: ${JSON.stringify(
          initDataUnsafe,
          null,
          2
        )}`
      );
      addDebugLog(`🔍 Telegram WebApp version: ${tg.version}`);
      addDebugLog(`🔍 Telegram WebApp platform: ${tg.platform}`);

      // Если user_id не был установлен из start_param, пробуем из initDataUnsafe
      // (это резервный вариант)
      if (!userIdFromStartParam && initDataUnsafe.user?.id) {
        const fallbackUserId = initDataUnsafe.user.id;
        setUserId(fallbackUserId);
        addDebugLog(
          `👤 Fallback user ID from initDataUnsafe: ${fallbackUserId}`
        );
      }

      // Собираем полные данные пользователя
      const userData = {
        user: {
          id: userIdFromStartParam || initDataUnsafe.user?.id || 0,
          first_name: initDataUnsafe.user?.first_name || "Пользователь",
          ...initDataUnsafe.user,
        },
        ...initDataUnsafe,
      };

      setInitData(userData);
      addDebugLog(`📊 Final user data: ${JSON.stringify(userData, null, 2)}`);
    } else {
      addDebugLog("⚠️ Not in Telegram environment");

      // Если в не-Telegram окружении и нет user_id, создаем минимальные данные
      const userData = {
        user: {
          id: userIdFromStartParam || 0,
          first_name: "Пользователь",
        },
      };
      setInitData(userData);
      addDebugLog(
        `📊 Final user data (non-Telegram): ${JSON.stringify(
          userData,
          null,
          2
        )}`
      );
    }

    // Финальная проверка
    const currentUserId = userIdFromStartParam || initData.user?.id;
    if (!currentUserId) {
      addDebugLog("⚠️ User ID not found in any source");
    } else {
      addDebugLog(`🎯 Final user ID for this session: ${currentUserId}`);
    }

    // Загружаем пользователей для отладки
    getUsers()
      .then((users) => {
        setUsers(users);
        addDebugLog(`✅ Loaded ${users.length} users from database`);
      })
      .catch((err) => {
        addDebugLog(`❌ Failed to load users: ${err.message}`);
      });
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim()) {
      setStatus("error");
      setStatusMessage("Введите текст сообщения");
      addDebugLog("❌ Empty message text in send attempt");
      return;
    }

    // Используем userId из state или initData
    const currentUserId = userId || initData.user?.id;

    if (!currentUserId) {
      setStatus("error");
      setStatusMessage(
        "Не удалось определить ваш ID. Перезапустите приложение через бота командой /start."
      );
      addDebugLog("❌ User ID not found for sending message");
      return;
    }

    addDebugLog(
      `🚀 Sending message with data: ${JSON.stringify({
        text: messageText,
        userId: currentUserId,
        backendURL: backendURL,
      })}`
    );

    setStatus("sending");
    setStatusMessage("Отправка...");

    try {
      const result = await sendMessage(messageText, currentUserId);
      addDebugLog(`✅ Message sent successfully: ${JSON.stringify(result)}`);
      setStatus("sent");
      setStatusMessage("✅ Сообщение отправлено в Telegram!");
      setMessageText("");
    } catch (error: any) {
      addDebugLog(`❌ Error sending message: ${error.message}`);
      setStatus("error");
      setStatusMessage(`❌ Ошибка: ${error.message}`);
    }
  };

  // Функция для перезагрузки пользователей
  const handleRefreshUsers = async () => {
    addDebugLog("🔄 Manually refreshing users list");
    try {
      const users = await getUsers();
      setUsers(users);
      addDebugLog(`✅ Refreshed users list: ${users.length} users`);
    } catch (error: any) {
      addDebugLog(`❌ Failed to refresh users: ${error.message}`);
    }
  };

  // Получаем актуальный user_id для отображения
  const displayUserId = userId || initData.user?.id;

  return (
    <div className="app-container">
      <header className="hero">
        <h1>👋 Привет, {initData.user?.first_name || "друг"}!</h1>
        <p className="subtitle">
          <strong>Ваш ID:</strong> {displayUserId || "неизвестен"}
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
        <div className="users-header">
          <h2>📊 Пользователи в базе данных ({users.length})</h2>
          <button
            onClick={handleRefreshUsers}
            className="refresh-button"
            title="Обновить список пользователей"
          >
            🔄
          </button>
        </div>
        <div className="users-list">
          {users.length === 0 ? (
            <div className="no-users">
              <p>Нет пользователей в базе данных</p>
              <p className="hint">
                Попробуйте нажать /start в боте для регистрации
              </p>
            </div>
          ) : (
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Имя</th>
                    <th>Фамилия</th>
                    <th>Username</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.first_name || "-"}</td>
                      <td>{user.last_name || "-"}</td>
                      <td>{user.username ? `@${user.username}` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="debug-controls">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="debug-toggle"
        >
          {showDebug ? "🔽 Скрыть логи" : "🔼 Показать логи"}
        </button>
        <button onClick={() => setDebugLogs([])} className="debug-clear">
          Очистить логи
        </button>
        <button onClick={handleRefreshUsers} className="debug-refresh">
          Обновить пользователей
        </button>
      </div>

      {showDebug && (
        <div className="debug-info">
          <details open>
            <summary>🔧 Отладочная информация</summary>
            <div className="debug-content">
              <div className="debug-section">
                <h3>Логи системы:</h3>
                <div className="debug-logs">
                  {debugLogs.length === 0 ? (
                    <p>Нет логов</p>
                  ) : (
                    debugLogs.map((log, index) => (
                      <div key={index} className="debug-log-line">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="debug-section">
                <h3>Текущие состояния:</h3>
                <pre>
                  {JSON.stringify(
                    {
                      userIdFromState: userId,
                      displayUserId: displayUserId,
                      initDataUserId: initData.user?.id,
                      canSend: !!displayUserId,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>

              <div className="debug-section">
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
              </div>

              <div className="debug-section">
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
              </div>

              <div className="debug-section">
                <h3>Backend информация:</h3>
                <pre>
                  {JSON.stringify(
                    {
                      backendURL: backendURL,
                      usersCount: users.length,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

export default App;
