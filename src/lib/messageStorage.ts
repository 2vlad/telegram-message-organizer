import { Message, Chat, User } from 'telegram/tl/types';

/**
 * Типы чатов для категоризации
 */
export enum ChatType {
  PERSONAL = 'personal',
  NEWS = 'news',
  DISCUSSION = 'discussion',
  UNKNOWN = 'unknown'
}

/**
 * Сервис для хранения и категоризации сообщений
 */
export class MessageStorageService {
  private messages: Message[] = [];
  private personalMessagesCache: Map<string, Message[]> = new Map();
  private newsMessagesCache: Map<string, Message[]> = new Map();
  private discussionMessagesCache: Map<string, Message[]> = new Map();
  private chatTypeCache: Map<string, ChatType> = new Map();
  private currentUserId: number | null = null;
  private lastCategorization: number = 0;

  /**
   * Устанавливает ID текущего пользователя
   * @param userId ID пользователя
   */
  setCurrentUserId(userId: number): void {
    this.currentUserId = userId;
    // Сбрасываем кэш при смене пользователя
    this.clearCaches();
  }

  /**
   * Очищает все кэши
   */
  clearCaches(): void {
    this.personalMessagesCache.clear();
    this.newsMessagesCache.clear();
    this.discussionMessagesCache.clear();
    this.chatTypeCache.clear();
    this.lastCategorization = 0;
  }

  /**
   * Добавляет сообщения в хранилище
   * @param messages Массив сообщений
   */
  addMessages(messages: Message[]): void {
    this.messages = [...this.messages, ...messages];
    this.clearCaches(); // Сбрасываем кэш при добавлении новых сообщений
  }

  /**
   * Принудительно перекатегоризирует все сообщения
   */
  recategorizeAllMessages(): void {
    this.clearCaches();
    // Устанавливаем временную метку последней категоризации
    this.lastCategorization = Date.now();
  }

  /**
   * Определяет тип чата на основе его характеристик из API
   * @param chat Объект чата
   * @param message Сообщение из чата
   * @returns Тип чата
   */
  determineChatType(chat: Chat, message: Message): ChatType {
    // Проверяем кэш
    const chatId = chat.id.toString();
    if (this.chatTypeCache.has(chatId)) {
      return this.chatTypeCache.get(chatId) as ChatType;
    }

    let chatType = ChatType.UNKNOWN;

    // Используем только API данные для определения типа чата
    
    // Проверка на личный чат (приватный диалог между пользователями)
    if (chat._ === 'user') {
      // Проверка, что это не бот
      if ((chat as any).bot) {
        chatType = ChatType.NEWS;
      } else {
        chatType = ChatType.PERSONAL;
      }
    } 
    // Проверка на канал (новостной)
    else if (chat._ === 'channel' || chat._ === 'channelFull') {
      chatType = ChatType.NEWS;
    }
    // Проверка на групповой чат (дискуссия)
    else if (chat._ === 'chat' || chat._ === 'chatFull') {
      // Если в чате только 2 участника, это может быть личный чат
      if (chat.participants_count === 2) {
        chatType = ChatType.PERSONAL;
      } else {
        chatType = ChatType.DISCUSSION;
      }
    }

    // Сохраняем в кэш
    this.chatTypeCache.set(chatId, chatType);
    return chatType;
  }

  /**
   * Проверяет, является ли сообщение личным на основе API данных
   * @param message Сообщение
   * @returns true, если сообщение личное
   */
  isPersonalMessage(message: Message): boolean {
    if (!this.currentUserId) {
      return false;
    }

    // Проверяем, что сообщение имеет peer_id
    if (!message.peer_id) return false;

    // Проверяем тип peer_id из API
    if (message.peer_id._ === 'peerUser') {
      // Получаем информацию о чате
      const chat = message.peerId as unknown as Chat;
      
      // Проверяем, что это не бот (используем API данные)
      if (chat && chat._ === 'user' && (chat as any).bot) {
        return false;
      }

      // Проверяем двустороннюю коммуникацию с использованием API данных
      const fromUserId = message.from_id && message.from_id._ === 'peerUser' 
        ? (message.from_id as any).user_id 
        : null;
      
      const toUserId = message.peer_id.user_id;
      
      // Проверяем, что сообщение либо от текущего пользователя, либо к нему
      const isCurrentUserInvolved = 
        fromUserId === this.currentUserId || 
        toUserId === this.currentUserId;
      
      if (!isCurrentUserInvolved) {
        return false;
      }

      return true;
    }
    
    // Если это не peerUser, то это не личное сообщение
    return false;
  }

  /**
   * Получает личные сообщения
   * @returns Массив личных сообщений
   */
  getPersonalMessages(): Message[] {
    if (!this.currentUserId) {
      console.warn('Current user ID is not set');
      return [];
    }

    const cacheKey = 'personal';
    if (this.personalMessagesCache.has(cacheKey) && this.lastCategorization > 0) {
      return this.personalMessagesCache.get(cacheKey) || [];
    }

    // Применяем фильтрацию на основе API данных
    const personalMessages = this.messages.filter(message => {
      // Базовая проверка на личное сообщение по API данным
      if (!this.isPersonalMessage(message)) {
        return false;
      }

      // Дополнительная проверка на категорию чата по API данным
      const chat = message.peerId as unknown as Chat;
      if (chat) {
        return this.verifyMessageCategory(message, ChatType.PERSONAL);
      }

      return true;
    });

    this.personalMessagesCache.set(cacheKey, personalMessages);
    
    // Устанавливаем временную метку последней категоризации, если она еще не установлена
    if (this.lastCategorization === 0) {
      this.lastCategorization = Date.now();
    }
    
    return personalMessages;
  }

  /**
   * Получает новостные сообщения
   * @returns Массив новостных сообщений
   */
  getNewsMessages(): Message[] {
    const cacheKey = 'news';
    if (this.newsMessagesCache.has(cacheKey) && this.lastCategorization > 0) {
      return this.newsMessagesCache.get(cacheKey) || [];
    }

    const newsMessages = this.messages.filter(message => {
      // Проверяем, что сообщение имеет peer_id
      if (!message.peer_id) return false;

      // Используем API данные для определения новостных сообщений
      if (message.peer_id._ === 'peerChannel') {
        return true;
      }
      
      // Проверяем, что это бот (используем API данные)
      if (message.peer_id._ === 'peerUser') {
        const chat = message.peerId as unknown as Chat;
        if (chat && chat._ === 'user' && (chat as any).bot) {
          return true;
        }
      }

      // Проверяем категорию чата по API данным
      const chat = message.peerId as unknown as Chat;
      if (chat) {
        return this.determineChatType(chat, message) === ChatType.NEWS;
      }

      return false;
    });

    this.newsMessagesCache.set(cacheKey, newsMessages);
    
    // Устанавливаем временную метку последней категоризации, если она еще не установлена
    if (this.lastCategorization === 0) {
      this.lastCategorization = Date.now();
    }
    
    return newsMessages;
  }

  /**
   * Получает дискуссионные сообщения
   * @returns Массив дискуссионных сообщений
   */
  getDiscussionMessages(): Message[] {
    const cacheKey = 'discussion';
    if (this.discussionMessagesCache.has(cacheKey) && this.lastCategorization > 0) {
      return this.discussionMessagesCache.get(cacheKey) || [];
    }

    const discussionMessages = this.messages.filter(message => {
      // Проверяем, что сообщение имеет peer_id
      if (!message.peer_id) return false;

      // Используем API данные для определения дискуссионных сообщений
      if (message.peer_id._ === 'peerChat') {
        const chat = message.peerId as unknown as Chat;
        // Если в чате больше 2 участников, это дискуссия
        if (chat && chat.participants_count && chat.participants_count > 2) {
          return true;
        }
      }

      // Проверяем категорию чата по API данным
      const chat = message.peerId as unknown as Chat;
      if (chat) {
        return this.determineChatType(chat, message) === ChatType.DISCUSSION;
      }

      return false;
    });

    this.discussionMessagesCache.set(cacheKey, discussionMessages);
    
    // Устанавливаем временную метку последней категоризации, если она еще не установлена
    if (this.lastCategorization === 0) {
      this.lastCategorization = Date.now();
    }
    
    return discussionMessages;
  }

  /**
   * Получает сообщения, сгруппированные по категориям
   * @returns Объект с сообщениями по категориям
   */
  getGroupedMessagesByCategory(): { 
    personal: Message[], 
    news: Message[], 
    discussion: Message[] 
  } {
    // Используем единую логику категоризации для всех типов запросов
    return {
      personal: this.getPersonalMessages(),
      news: this.getNewsMessages(),
      discussion: this.getDiscussionMessages()
    };
  }

  /**
   * Выполняет финальную проверку, что сообщение действительно относится к указанной категории
   * @param message Сообщение
   * @param category Категория
   * @returns true, если сообщение относится к категории
   */
  verifyMessageCategory(message: Message, category: ChatType): boolean {
    if (!message.peer_id) return false;

    const chat = message.peerId as unknown as Chat;
    if (!chat) return false;

    // Для личных сообщений применяем дополнительные проверки на основе API данных
    if (category === ChatType.PERSONAL) {
      // Проверяем, что это не бот (используем API данные)
      if (chat._ === 'user' && (chat as any).bot) {
        return false;
      }
      
      // Проверяем двустороннюю коммуникацию с использованием API данных
      if (this.currentUserId) {
        const fromUserId = message.from_id && message.from_id._ === 'peerUser' 
          ? (message.from_id as any).user_id 
          : null;
        
        const toUserId = message.peer_id._ === 'peerUser' 
          ? message.peer_id.user_id 
          : null;
        
        // Проверяем, что сообщение либо от текущего пользователя, либо к нему
        const isCurrentUserInvolved = 
          fromUserId === this.currentUserId || 
          toUserId === this.currentUserId;
        
        if (!isCurrentUserInvolved) {
          return false;
        }
      }
    }

    // Получаем определенный тип чата на основе API данных
    const chatType = this.determineChatType(chat, message);

    // Проверяем соответствие категории
    return chatType === category;
  }
}