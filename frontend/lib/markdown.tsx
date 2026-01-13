import React from "react";

// Simple markdown parser to render **bold** text (removes asterisks and makes text bold)
export const parseMarkdown = (text: string): (string | JSX.Element)[] => {
  const parts: (string | JSX.Element)[] = [];
  let key = 0;
  let lastIndex = 0;

  // Process bold text **text** - replace with bold styling
  const boldRegex = /\*\*(.*?)\*\*/g;
  let match;
  const matches: RegExpExecArray[] = [];

  // Collect all matches first
  while ((match = boldRegex.exec(text)) !== null) {
    matches.push(match);
  }

  // If no matches, return original text as array
  if (matches.length === 0) {
    return [text];
  }

  // Process matches
  matches.forEach((match) => {
    // Add text before the match
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      if (beforeText) {
        parts.push(beforeText);
      }
    }
    // Add bold text (without asterisks)
    parts.push(
      <strong key={key++} className="font-semibold">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  });

  // Add remaining text after last match
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      parts.push(remainingText);
    }
  }

  return parts.length > 0 ? parts : [text];
};
