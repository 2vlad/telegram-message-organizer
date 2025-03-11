import React from 'react';
import EnvelopeIcon from './icons/EnvelopeIcon';

interface UnreadMessagesBannerProps {
  count: number;
  greeting?: string;
  onClick?: () => void;
}

const UnreadMessagesBanner: React.FC<UnreadMessagesBannerProps> = ({
  count,
  greeting = 'Good afternoon',
  onClick
}) => {
  if (count <= 0) return null;

  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="w-full bg-white p-6 rounded-lg shadow-sm mb-6">
      <h1 className="text-3xl font-bold mb-4">{dayOfWeek}</h1>
      
      <div 
        className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200"
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={`${greeting}, you have ${count} unread personal messages`}
      >
        <div className="mr-4">
          <EnvelopeIcon className="text-blue-500" width={32} height={32} />
        </div>
        <div>
          <p className="text-xl font-medium text-gray-900">
            {greeting}, you have <span className="text-blue-500 font-bold">{count}</span> unread personal messages
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnreadMessagesBanner;