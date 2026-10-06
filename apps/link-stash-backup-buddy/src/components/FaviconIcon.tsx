import { useState } from 'react';

interface FaviconIconProps {
  url: string;
  className?: string;
  size?: number;
}

const getDomainInitials = (url: string) => {
  try {
    return new URL(url).hostname.replace('www.', '').substring(0, 2).toUpperCase();
  } catch { return '??' }
};

const getColorClass = (str: string) => {
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-teal-400', 'bg-blue-400', 'bg-indigo-400', 'bg-purple-400', 'bg-pink-400', 'bg-rose-400'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
};

export const FaviconIcon = ({ url, className = "w-4 h-4", size = 16 }: FaviconIconProps) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getFaviconUrl = (websiteUrl: string) => {
    try {
      const domain = new URL(websiteUrl).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
    } catch { return null; }
  };

  const faviconUrl = getFaviconUrl(url);
  const initials = getDomainInitials(url);
  const colorClass = getColorClass(initials);

  if (!faviconUrl || hasError) {
    return (
      <div className={`${className} ${colorClass} rounded flex items-center justify-center flex-shrink-0`}>
        <span className="text-white font-black leading-none select-none" style={{ fontSize: `${Math.max(size * 0.32, 8)}px` }}>
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div className={`${className} relative flex-shrink-0`}>
      {isLoading && (
        <div className={`absolute inset-0 ${colorClass} rounded flex items-center justify-center`}>
          <span className="text-white font-black leading-none select-none opacity-70" style={{ fontSize: `${Math.max(size * 0.32, 8)}px` }}>
            {initials}
          </span>
        </div>
      )}
      <img
        src={faviconUrl}
        alt=""
        className={`${className} rounded object-cover`}
        onLoad={() => setIsLoading(false)}
        onError={() => { setHasError(true); setIsLoading(false); }}
        style={{ display: isLoading ? 'none' : 'block' }}
      />
    </div>
  );
};
