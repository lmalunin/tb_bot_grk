
import { useEffect, useState } from 'react';
import { fetchMessages } from './api';
import './App.scss';  // Импорт SCSS

const tg = (window as any).Telegram?.WebApp;

function App() {
    const [initData, setInitData] = useState<any>({});
    const [messages, setMessages] = useState<any>(null);

    useEffect(() => {
        setInitData(tg?.initDataUnsafe || {});
        fetchMessages().then(setMessages);
    }, []);

    return (
        <div className="app-container">
            <h1>👋 Привет, {initData?.user?.first_name || 'друг'}!</h1>
            <h3>Данные из Telegram:</h3>
            <pre>{JSON.stringify(initData.user, null, 2)}</pre>
            <h3>Юзеры из бота (/messages):</h3>
            <pre>{JSON.stringify(messages, null, 2)}</pre>
        </div>
    );
}

export default App;
