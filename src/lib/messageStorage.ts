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

    // Проверка на личный чат (диалог между двумя пользователями)
    if (chat._ === 'chat' && chat.participants_count === 2) {
      chatType = ChatType.PERSONAL;
    } 
    // Проверка на личный чат (приватный диалог)
    else if (chat._ === 'user') {
      chatType = ChatType.PERSONAL;
    }
    // Проверка на канал (новостной)
    else if (
      chat._ === 'channel' || 
      chat._ === 'channelFull' ||
      // Проверка на паттерны в названии, указывающие на новостной канал
      /channel|канал|news|новост|блог|blog|official|официальн/i.test(chat.title || '') ||
      // Проверка на односторонний характер общения
      (message && message.from_id && message.from_id._ === 'peerChannel')
    ) {
      chatType = ChatType.NEWS;
    }
    // Проверка на групповой чат (дискуссия)
    else if (
      chat._ === 'chat' || 
      chat._ === 'chatFull' ||
      // Проверка на паттерны в названии, указывающие на дискуссионный чат
      /group|группа|chat|чат|discuss|дискусс|community|сообщество/i.test(chat.title || '') ||
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

    const personalMessages = this.messages.filter(message => {
      // Проверяем, что сообщение имеет peer_id
      if (!message.peer_id) return false;

      // Проверяем, что это не канал и не группа
      if (message.peer_id._ === 'peerChannel' || message.peer_id._ === 'peerChat') {
        return false;
      }

      // Проверяем, что это диалог между пользователями
      if (message.peer_id._ === 'peerUser') {
        // Проверяем, что это не бот
        const chat = message.peerId as unknown as Chat;
        if (chat && chat._ === 'user' && chat.bot) {
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

        return true;
      }

      return false;
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

      // Проверяем, что это канал
      if (message.peer_id._ === 'peerChannel') {
        const chat = message.peerId as unknown as Chat;
        return this.determineChatType(chat, message) === ChatType.NEWS;
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
        return this.determineChatType(chat, message) === ChatType.DISCUSSION;
      }

      return false;
    });

    this.discussionMessagesCache.set(cacheKey, discussionMessages);
    return discussionMessages;
  }

  /**
   * Получает сообщения, сгруппированные по категор��ям
   * @returns Объект с сообщениями по категориям
   */
  getGroupedMessagesByCategory(): { 
    personal: Message[], 
    news: Message[], 
    discussion: Message[] 
  } {
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

    // Получаем определенный тип чата
    const chatType = this.determineChatType(chat, message);

    // Проверяем соответствие категории
    return chatType === category;
  }
}