import React from 'react';
import { ExternalLink } from 'lucide-react';

interface LinkifiedTextProps {
  text: string;
  isMe?: boolean;
  className?: string;
}

// Regex to capture links starting with http://, https://, or www.
const URL_SPLIT_REGEX = /((?:https?:\/\/|www\.)[^\s<>"'{}|\\^`[\]]+)/gi;
const PUNCTUATION_END_REGEX = /[.,!?;:)]+$/;

export const LinkifiedText: React.FC<LinkifiedTextProps> = ({ text, isMe = false, className = '' }) => {
  if (!text) return null;

  // Split text by URL pattern while preserving matches
  const tokens = text.split(URL_SPLIT_REGEX);

  return (
    <span className={className}>
      {tokens.map((token, idx) => {
        if (!token) return null;

        // Check if token starts with http://, https://, or www.
        const isMatch = /^(https?:\/\/|www\.)/i.test(token);

        if (isMatch) {
          let url = token;
          let trailingPunct = '';

          const match = url.match(PUNCTUATION_END_REGEX);
          if (match) {
            trailingPunct = match[0];
            url = url.slice(0, -trailingPunct.length);
          }

          // Build proper href
          const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;

          return (
            <React.Fragment key={idx}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`inline-flex items-center gap-1 font-semibold underline underline-offset-3 cursor-pointer break-all transition-colors ${
                  isMe
                    ? 'text-sky-300 hover:text-sky-100 hover:decoration-sky-200 decoration-sky-400/60'
                    : 'text-[#4f46e5] hover:text-[#3730a3] hover:decoration-[#4338ca] decoration-[#6366f1]/60'
                }`}
                title={`فتح الرابط: ${href}`}
              >
                <span className="dir-ltr text-left">{url}</span>
                <ExternalLink className="w-3 h-3 inline-block shrink-0 opacity-80" />
              </a>
              {trailingPunct}
            </React.Fragment>
          );
        }

        // Standard text
        return <span key={idx}>{token}</span>;
      })}
    </span>
  );
};
