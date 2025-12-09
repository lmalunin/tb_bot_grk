
import axios from 'axios';

export function getBackendURL(): string {
    const tg = (window as any).Telegram?.WebApp;
    const startParam = tg?.initDataUnsafe?.start_param || new URLSearchParams(window.location.search).get('startapp');
    return startParam || 'http://localhost:8080';  // Fallback для dev
}

export async function fetchMessages() {
    const url = `${getBackendURL()}/messages`;
    try {
        const res = await axios.get(url, {
            headers: { 'X-Telegram-Web-App-Init-Data': (window as any).Telegram?.WebApp?.initData }  // Для валидации
        });
        return res.data;
    } catch (e) {
        console.error('Failed to fetch', url, e);
        return { error: 'no_connection' };
    }
}
