'use client';

import { useEffect, useState, useCallback } from 'react';
import { Message } from 'telegram/tl/types';
import { MessageStorageService, ChatType } from '@/lib/messageStorage';
import { toast } from 'react-hot-toast';
import UnreadMessagesBanner from '@/components/UnreadMessagesBanner';

// Инициализация сервиса хранения сообщений
const messageStorage = new MessageStorageService();

export default function MessagesPage() {
  const [messages, setMessages] = useState<{
    personal: Message[];
    news: Message[];
    discussion: Message[];
  }>({
    personal: [],
    news: [],
    discussion: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'personal' | 'news' | 'discussion'>('news');
  const [unreadPersonalCount, setUnreadPersonalCount] = useState<number>(0);
  const [greeting, setGreeting] = useState<string>('Good morning');

  // Функция для получения моковых данных
  const getMockMessages = async (): Promise<Message[]> => {
    // Имитация задержки сети
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Здесь в реальном приложении были бы настоящие данные из Telegram API
    return [
      // Моковые данные для демонстрации
    ] as unknown as Message[];
  };

  // Функция для категоризации сообщений с применением финальной проверки
  const categorizeAndVerifyMessages = useCallback(() => {
    // Получаем сгруппированные сообщения
    const groupedMessages = messageStorage.getGroupedMessagesByCategory();
    
    // Применяем финальную проверку категоризации для всех категорий
    const verifiedMessages = {
      personal: groupedMessages.personal.filter(msg => 
        messageStorage.verifyMessageCategory(msg, ChatType.PERSONAL)
      ),
      news: groupedMessages.news.filter(msg => 
        messageStorage.verifyMessageCategory(msg, ChatType.NEWS)
      ),
      discussion: groupedMessages.discussion.filter(msg => 
        messageStorage.verifyMessageCategory(msg, ChatType.DISCUSSION)
      )
    };
    
    return verifiedMessages;
  }, []);

  // Функция для обновления сообщений
  const refreshMessages = useCallback(async () => {
    try {
      setLoading(true);
      
      // В реальном приложении здесь был бы запрос к Telegram API
      const mockMessages = await getMockMessages();
      
      // Добавляем сообщения в хранилище
      messageStorage.addMessages(mockMessages);
      
      // Категоризируем и проверяем сообщения
      const verifiedMessages = categorizeAndVerifyMessages();
      
      setMessages(verifiedMessages);
    } catch (error) {
      console.error('Error refreshing messages:', error);
      toast.error('Ошибка при обновлении сообщений');
    } finally {
      setLoading(false);
    }
  }, [categorizeAndVerifyMessages]);

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

    // Имитация загрузки сообщений из Telegram API
    const fetchMessages = async () => {
      try {
        setLoading(true);
        
        // Устанавливаем ID текущего пользователя
        messageStorage.setCurrentUserId(12345);
        
        // В реальном приложении здесь был бы запрос к Telegram API
        const mockMessages = await getMockMessages();
        
        // Добавляем сообщения в хранилище
        messageStorage.addMessages(mockMessages);
        
        // Категоризируем и проверяем сообщения
        const verifiedMessages = categorizeAndVerifyMessages();
        
        setMessages(verifiedMessages);

        // Имитация непрочитанных личных сообщений (для демонстрации используем 56, как на скриншоте)
        setUnreadPersonalCount(56);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Ошибка при загрузке сообщений');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [categorizeAndVerifyMessages]);

  // Обработчик клика по баннеру
  const handleBannerClick = () => {
    setActiveTab('personal');
    toast.success('Переход к личным сообщениям');
  };

  // Рендер сообщения
  const renderMessage = (message: Message) => {
    return (
      <div key={message.id} className="p-4 border rounded-lg mb-2 bg-white shadow-sm">
        <div className="font-medium">{message.message || 'Медиа-контент'}</div>
        <div className="text-sm text-gray-500 mt-1">
          {new Date((message.date || 0) * 1000).toLocaleString()}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      {/* Баннер с уведомлением о непрочитанных сообщениях */}
      {unreadPersonalCount > 0 && activeTab !== 'personal' && (
        <UnreadMessagesBanner 
          count={unreadPersonalCount} 
          greeting={greeting}
          onClick={handleBannerClick} 
        />
      )}
      
      {/* Табы для переключения категорий */}
      <div className="flex border-b mb-4">
        <button
          className={`py-2 px-4 relative ${activeTab === 'personal' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('personal')}
        >
          Personal ({messages.personal.length})
          {unreadPersonalCount > 0 && activeTab !== 'personal' && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadPersonalCount > 99 ? '99+' : unreadPersonalCount}
            </span>
          )}
        </button>
        <button
          className={`py-2 px-4 ${activeTab === 'news' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('news')}
        >
          News ({messages.news.length})
        </button>
        <button
          className={`py-2 px-4 ${activeTab === 'discussion' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('discussion')}
        >
          Discussions ({messages.discussion.length})
        </button>
      </div>
      
      {/* Контент выбранной категории */}
      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div>
            {activeTab === 'personal' && (
              <div>
                {messages.personal.length > 0 ? (
                  messages.personal.map(renderMessage)
                ) : (
                  <div className="text-center text-gray-500 py-8">No personal messages</div>
                )}
              </div>
            )}
            
            {activeTab === 'news' && (
              <div>
                {messages.news.length > 0 ? (
                  messages.news.map(renderMessage)
                ) : (
                  <div className="text-center text-gray-500 py-8">No news messages</div>
                )}
              </div>
            )}
            
            {activeTab === 'discussion' && (
              <div>
                {messages.discussion.length > 0 ? (
                  messages.discussion.map(renderMessage)
                ) : (
                  <div className="text-center text-gray-500 py-8">No discussion messages</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Кнопка обновления сообщений */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={refreshMessages}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg"
          aria-label="Refresh messages"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
}