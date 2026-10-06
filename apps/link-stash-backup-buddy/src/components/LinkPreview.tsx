
import { FaviconIcon } from './FaviconIcon';

interface LinkPreviewProps {
  linkId: string;
  url: string;
  title: string;
  preview?: any;
  onRefresh?: (linkId: string, url: string) => void;
  compact?: boolean;
}

export const LinkPreview = ({ 
  url,
  compact = false 
}: LinkPreviewProps) => {
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <FaviconIcon url={url} className="w-4 h-4" />
        <span className="text-xs text-green-300/70 font-mono truncate">
          {getDomain(url)}
        </span>
      </div>
    );
  }

  return null;
};
