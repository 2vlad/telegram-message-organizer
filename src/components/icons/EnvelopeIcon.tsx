import React from 'react';

interface EnvelopeIconProps {
  className?: string;
  width?: number;
  height?: number;
}

const EnvelopeIcon: React.FC<EnvelopeIconProps> = ({ 
  className = '', 
  width = 24, 
  height = 24 
}) => {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 256 256" 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48ZM203.3,72,128,128.9,52.7,72ZM40,184V83.1l86.4,65a8,8,0,0,0,9.6,0L216,83.1V184Z" />
    </svg>
  );
};

export default EnvelopeIcon;