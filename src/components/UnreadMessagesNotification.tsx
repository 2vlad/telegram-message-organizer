import React from 'react';
import EnvelopeIcon from './icons/EnvelopeIcon';

interface UnreadMessagesNotificationProps {
  count: number;
  onClick?: () => void;
}

const UnreadMessagesNotification: React.FC<UnreadMessagesNotificationProps> = ({
  count,
  onClick
}) => {
  if (count <= 0) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 flex items-center cursor-pointer hover:bg-gray-50 transition-colors duration-200 border border-gray-200"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`У вас ${count} непрочитанных личных сообщений`}
    >
      <div className="relative">
        <EnvelopeIcon className="text-blue-500" width={28} height={28} />
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      </div>
      <div className="ml-3">
        <p className="text-sm font-medium text-gray-900">Доброе утро!</p>
        <p className="text-xs text-gray-600">У вас непрочитанные личные сообщения</p>
      </div>
    </div>
  );
};

export default UnreadMessagesNotification;