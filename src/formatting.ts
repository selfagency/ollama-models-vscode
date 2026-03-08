/**
 * Shared formatting utilities for extension and provider paths.
 */

/**
 * Format XML-like tags in LLM responses as markdown headings.
 * Example: <note>text</note> -> **Note**\ntext
 */
export function formatXmlLikeResponseForDisplay(text: string): string {
  if (!text || !text.includes('<') || !text.includes('>')) {
    return text;
  }

  const blockTagRe = /<([a-zA-Z_][a-zA-Z0-9_.-]*)[^>]*>([\s\S]*?)<\/\1>/g;
  let replaced = false;
  const transformed = text.replace(blockTagRe, (_full, rawTag: string, rawContent: string) => {
    const tag = rawTag.replace(/[._-]+/g, ' ').trim();
    const title = tag.charAt(0).toUpperCase() + tag.slice(1);
    const content = String(rawContent).trim();
    replaced = true;
    return `\n\n**${title}**\n${content}\n\n`;
  });

  return replaced ? transformed.trim() : text;
}
