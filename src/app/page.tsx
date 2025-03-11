'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import UnreadMessagesBanner from '@/components/UnreadMessagesBanner';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [greeting, setGreeting] = useState<string>('Good morning');

  useEffect(() => {
    // Определение приветствия в зависимости от времени суток
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Good morning');
    } else if (hour >= 12 && hour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }

    // Имитация получения данных о непрочитанных сообщениях
    const timer = setTimeout(() => {
      // Для демонстрации используем 56, как на скриншоте
      setUnreadCount(56);
      setShowNotification(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    
    try {
      // Имитация подключения к Telegram API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // В реальном приложении здесь был бы код для аутентификации в Telegram
      toast.success('Успешное подключение к Telegram!');
      
      // Перенаправление на страницу сообщений
      router.push('/messages');
    } catch (error) {
      console.error('Error connecting to Telegram:', error);
      toast.error('Ошибка при подключении к Telegram');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = () => {
    handleConnect();
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gray-50">
      {/* Баннер с уведомлением о непрочитанных сообщениях */}
      {showNotification && unreadCount > 0 && (
        <div className="w-full max-w-3xl mb-6">
          <UnreadMessagesBanner 
            count={unreadCount} 
            greeting={greeting}
            onClick={handleNotificationClick} 
          />
        </div>
      )}
      
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 mt-4">
        <h1 className="text-3xl font-bold text-center mb-6">
          Telegram Message Organizer
        </h1>
        
        <p className="text-gray-600 mb-8 text-center">
          Приложение для организации сообщений Telegram с категоризацией на личные, новостные и дискуссионные.
        </p>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="font-semibold text-blue-800 mb-2">Personal messages</h2>
            <p className="text-sm text-blue-600">
              Диалоги с друзьями, коллегами и другими пользователями
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h2 className="font-semibold text-green-800 mb-2">News channels</h2>
            <p className="text-sm text-green-600">
              Каналы с новостями, блоги и официальные источники информации
            </p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h2 className="font-semibold text-purple-800 mb-2">Discussions</h2>
            <p className="text-sm text-purple-600">
              Групповые чаты, дискуссии и сообщества
            </p>
          </div>
        </div>
        
        <button
          onClick={handleConnect}
          disabled={loading}
          className="mt-8 w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-200 disabled:opacity-70 flex items-center justify-center"
        >
          {loading ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              Connecting...
            </>
          ) : (
            'Connect to Telegram'
          )}
        </button>
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          Это демонстрационное приложение. В реальной версии потребуется авторизация через Telegram API.
        </p>
      </div>
    </main>
  );
}