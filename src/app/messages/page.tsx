'use client';

import { useEffect, useState } from 'react';
import { Message } from 'telegram/tl/types';
import { MessageStorageService, ChatType } from '@/lib/messageStorage';
import { toast } from 'react-hot-toast';
import UnreadMessagesNotification from '@/components/UnreadMessagesNotification';

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
  const [activeTab, setActiveTab] = useState<'personal' | 'news' | 'discussion'>('personal');
  const [unreadPersonalCount, setUnreadPersonalCount] = useState<number>(0);
  const [showNotification, setShowNotification] = useState<boolean>(false);

  useEffect(() => {
    // Имитация загрузки сообщений из Telegram API
    const fetchMessages = async () => {
      try {
        setLoading(true);
        
        // В реальном приложении здесь был бы запрос к Telegram API
        // Для демонстрации используем моковые данные
        const mockMessages = await getMockMessages();
        
        // Устанавливаем ID текущего пользователя
        messageStorage.setCurrentUserId(12345);
        
        // Добавляем сообщения в хранилище
        messageStorage.addMessages(mockMessages);
        
        // Получаем сгруппированные сообщения
        const groupedMessages = messageStorage.getGroupedMessagesByCategory();
        
        // Финальная проверка категоризации
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
        
        setMessages(verifiedMessages);

        // Имитация непрочитанных личных сообщений
        const unreadCount = Math.floor(Math.random() * 5) + 1; // Случайное число от 1 до 5
        setUnreadPersonalCount(unreadCount);
        
        // Показываем уведомление через небольшую задержку
        setTimeout(() => {
          setShowNotification(true);
        }, 2000);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Ошибка при загрузке сообщений');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  // Функция для получения моковых данных
  const getMockMessages = async (): Promise<Message[]> => {
    // Имитация задержки сети
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Здесь в реальном приложении были бы настоящие данные из Telegram API
    return [
      // Моковые данные для демонстрации
    ] as unknown as Message[];
  };

  // Обработчик клика по уведомлению
  const handleNotificationClick = () => {
    setActiveTab('personal');
    setShowNotification(false);
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
      <h1 className="text-2xl font-bold mb-6">Сообщения Telegram</h1>
      
      {/* Табы для переключения категорий */}
      <div className="flex border-b mb-4">
        <button
          className={`py-2 px-4 relative ${activeTab === 'personal' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('personal')}
        >
          Личные ({messages.personal.length})
          {unreadPersonalCount > 0 && activeTab !== 'personal' && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadPersonalCount}
            </span>
          )}
        </button>
        <button
          className={`py-2 px-4 ${activeTab === 'news' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('news')}
        >
          Новости ({messages.news.length})
        </button>
        <button
          className={`py-2 px-4 ${activeTab === 'discussion' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('discussion')}
        >
          Обсуждения ({messages.discussion.length})
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
                  <div className="text-center text-gray-500 py-8">Нет личных сообщений</div>
                )}
              </div>
            )}
            
            {activeTab === 'news' && (
              <div>
                {messages.news.length > 0 ? (
                  messages.news.map(renderMessage)
                ) : (
                  <div className="text-center text-gray-500 py-8">Нет новостных сообщений</div>
                )}
              </div>
            )}
            
            {activeTab === 'discussion' && (
              <div>
                {messages.discussion.length > 0 ? (
                  messages.discussion.map(renderMessage)
                ) : (
                  <div className="text-center text-gray-500 py-8">Нет сообщений из обсуждений</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Уведомление о непрочитанных сообщениях */}
      {showNotification && unreadPersonalCount > 0 && activeTab !== 'personal' && (
        <UnreadMessagesNotification 
          count={unreadPersonalCount} 
          onClick={handleNotificationClick} 
        />
      )}
    </div>
  );
}