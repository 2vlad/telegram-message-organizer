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
 * Регулярные выражения для фильтрации чатов
 */
const CHANNEL_PATTERNS = /channel|канал|news|новост|блог|blog|official|официальн|feed|бот|bot|service|telegram|admin|info|alert|notify|update|digest|daily|weekly|bulletin|report/i;
const GROUP_PATTERNS = /group|группа|chat|чат|discuss|дискусс|community|сообщество/i;

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
   * Определяет тип чата на основе его характеристик
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

    // Проверка на публичный канал или бот по названию
    if (chat.title && CHANNEL_PATTERNS.test(chat.title)) {
      chatType = ChatType.NEWS;
      this.chatTypeCache.set(chatId, chatType);
      return chatType;
    }

    // Проверка на групповой чат по названию
    if (chat.title && GROUP_PATTERNS.test(chat.title)) {
      chatType = ChatType.DISCUSSION;
      this.chatTypeCache.set(chatId, chatType);
      return chatType;
    }

    // Проверка на личный чат (диалог между двумя пользователями)
    if (chat._ === 'user') {
      // Проверка, что это не бот
      if ((chat as any).bot) {
        chatType = ChatType.NEWS;
      } else {
        chatType = ChatType.PERSONAL;
      }
    } 
    // Проверка на личный чат (приватный диалог с ограниченным числом участников)
    else if (chat._ === 'chat' && chat.participants_count === 2) {
      chatType = ChatType.PERSONAL;
    }
    // Проверка на канал (новостной)
    else if (
      chat._ === 'channel' || 
      chat._ === 'channelFull' ||
      // Проверка на односторонний характер общения
      (message && message.from_id && message.from_id._ === 'peerChannel')
    ) {
      chatType = ChatType.NEWS;
    }
    // Проверка на групповой чат (дискуссия)
    else if (
      chat._ === 'chat' || 
      chat._ === 'chatFull' ||
      // Проверка на многостороннее общение
      (chat.participants_count && chat.participants_count > 2)
    ) {
      chatType = ChatType.DISCUSSION;
    }

    // Сохраняем в кэш
    this.chatTypeCache.set(chatId, chatType);
    return chatType;
  }

  /**
   * Проверяет, является ли сообщение личным
   * @param message Сообщение
   * @returns true, если сообщение личное
   */
  isPersonalMessage(message: Message): boolean {
    if (!this.currentUserId) {
      return false;
    }

    // Проверяем, что сообщение имеет peer_id
    if (!message.peer_id) return false;

    // Проверяем, что это не канал и не группа
    if (message.peer_id._ === 'peerChannel' || message.peer_id._ === 'peerChat') {
      return false;
    }

    // Проверяем, что это диалог между пользователями
    if (message.peer_id._ === 'peerUser') {
      // Получаем информацию о чате
      const chat = message.peerId as unknown as Chat;
      
      // Проверяем, что это не бот
      if (chat && chat._ === 'user' && (chat as any).bot) {
        return false;
      }

      // Проверяем название чата на наличие паттернов каналов/ботов
      if (chat && chat.title && CHANNEL_PATTERNS.test(chat.title)) {
        return false;
      }

      // Проверяем двустороннюю коммуникацию
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

      // Проверяем тип чата
      if (chat) {
        const chatType = this.determineChatType(chat, message);
        return chatType === ChatType.PERSONAL;
      }

      return true;
    }

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
    if (this.personalMessagesCache.has(cacheKey)) {
      return this.personalMessagesCache.get(cacheKey) || [];
    }

    // Применяем многоуровневую фильтрацию
    const personalMessages = this.messages.filter(message => {
      // Базовая проверка на личное сообщение
      if (!this.isPersonalMessage(message)) {
        return false;
      }

      // Дополнительная проверка на категорию чата
      const chat = message.peerId as unknown as Chat;
      if (chat) {
        return this.verifyMessageCategory(message, ChatType.PERSONAL);
      }

      return true;
    });

    this.personalMessagesCache.set(cacheKey, personalMessages);
    return personalMessages;
  }

  /**
   * Получает новостные сообщения
   * @returns Массив новостных сообщений
   */
  getNewsMessages(): Message[] {
    const cacheKey = 'news';
    if (this.newsMessagesCache.has(cacheKey)) {
      return this.newsMessagesCache.get(cacheKey) || [];
    }

    const newsMessages = this.messages.filter(message => {
      // Проверяем, что сообщение имеет peer_id
      if (!message.peer_id) return false;

      // Проверяем, что это канал или бот
      if (message.peer_id._ === 'peerChannel' || 
          (message.peer_id._ === 'peerUser' && message.peerId && (message.peerId as any).bot)) {
        const chat = message.peerId as unknown as Chat;
        return this.verifyMessageCategory(message, ChatType.NEWS);
      }

      // Проверяем название чата на наличие паттернов каналов/ботов
      const chat = message.peerId as unknown as Chat;
      if (chat && chat.title && CHANNEL_PATTERNS.test(chat.title)) {
        return true;
      }

      return false;
    });

    this.newsMessagesCache.set(cacheKey, newsMessages);
    return newsMessages;
  }

  /**
   * Получает дискуссионные сообщения
   * @returns Массив дискуссионных сообщений
   */
  getDiscussionMessages(): Message[] {
    const cacheKey = 'discussion';
    if (this.discussionMessagesCache.has(cacheKey)) {
      return this.discussionMessagesCache.get(cacheKey) || [];
    }

    const discussionMessages = this.messages.filter(message => {
      // Проверяем, что сообщение имеет peer_id
      if (!message.peer_id) return false;

      // Проверяем, что это группа или канал с дискуссией
      if (message.peer_id._ === 'peerChat' || message.peer_id._ === 'peerChannel') {
        const chat = message.peerId as unknown as Chat;
        
        // Проверяем название чата на наличие паттернов групп
        if (chat && chat.title && GROUP_PATTERNS.test(chat.title)) {
          return true;
        }
        
        return this.verifyMessageCategory(message, ChatType.DISCUSSION);
      }

      return false;
    });

    this.discussionMessagesCache.set(cacheKey, discussionMessages);
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

    // Для личных сообщений применяем дополнительные проверки
    if (category === ChatType.PERSONAL) {
      // Проверяем, что это не бот
      if (chat._ === 'user' && (chat as any).bot) {
        return false;
      }
      
      // Проверяем название на паттерны каналов/ботов
      if (chat.title && CHANNEL_PATTERNS.test(chat.title)) {
        return false;
      }
      
      // Проверяем двустороннюю коммуникацию
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

    // Получаем определенный тип чата
    const chatType = this.determineChatType(chat, message);

    // Проверяем соответствие категории
    return chatType === category;
  }
}