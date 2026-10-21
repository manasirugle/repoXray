"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface MarkdownProps {
  content: string;
}

export default function Markdown({ content }: MarkdownProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!content) return <p className="text-secondary italic">No content available.</p>;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Safe and super clean markdown regex splitter/parser
  const parseMarkdown = (text: string) => {
    const lines = text.split("\n");
    let inList = false;
    let listItems: string[] = [];
    const elements: React.ReactNode[] = [];
    let key = 0;

    let inCodeBlock = false;
    let codeLanguage = "";
    let codeContent: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${key++}`} className="markdown-list list-disc pl-6 mb-4 space-y-2">
            {listItems.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    const formatInline = (str: string) => {
      // Bold **text**
      let formatted = str.replace(/\*\*(.*?)\*\*/g, '<strong class="markdown-strong">$1</strong>');
      // Italic *text*
      formatted = formatted.replace(/\*(.*?)\*/g, '<em class="markdown-em">$1</em>');
      // Inline Code `code`
      formatted = formatted.replace(/`(.*?)`/g, '<code class="markdown-inline-code">$1</code>');
      return formatted;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code Block handling
      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          // End of code block
          const blockText = codeContent.join("\n");
          const blockLang = codeLanguage || "code";
          const currentIndex = key++;
          
          elements.push(
            <div key={`code-${currentIndex}`} className="markdown-code-block relative group my-5 rounded-lg overflow-hidden border w-full max-w-full">
              <div className="markdown-code-header border-b px-4 py-2 flex items-center justify-between text-xs font-mono">
                <span>{blockLang}</span>
                <button
                  onClick={() => handleCopy(blockText, currentIndex)}
                  className="markdown-copy-button px-2.5 py-1 rounded border text-[11px] transition-all flex items-center gap-1"
                  title="Copy Code"
                >
                  {copiedIndex === currentIndex ? (
                    <Check size={14} className="text-emerald-400" />
                  ) : (
                    <Copy size={14} />
                  )}
                  <span>{copiedIndex === currentIndex ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="markdown-pre p-4 overflow-x-auto font-mono leading-relaxed max-h-[400px] w-full max-w-full block">
                <code>{blockText}</code>
              </pre>
            </div>
          );

          inCodeBlock = false;
          codeContent = [];
          codeLanguage = "";
        } else {
          // Start of code block
          flushList();
          inCodeBlock = true;
          codeLanguage = line.trim().slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }

      // Headers
      if (line.trim().startsWith("#")) {
        flushList();
        const headerLevel = line.match(/^#+/)?.[0].length || 1;
        const headerText = line.replace(/^#+\s*/, "");
        const formattedText = formatInline(headerText);

        const classes = 
          headerLevel === 1 ? "markdown-h1 mt-6 mb-4 border-b pb-2" :
          headerLevel === 2 ? "markdown-h2 mt-8 mb-4" :
          headerLevel === 3 ? "markdown-h3 mt-6 mb-3" :
          "markdown-h4 mt-4 mb-2";

        const HeadingTag = `h${Math.min(headerLevel + 1, 6)}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
        elements.push(
          <HeadingTag
            key={`h-${key++}`}
            className={classes}
            dangerouslySetInnerHTML={{ __html: formattedText }}
          />
        );
        continue;
      }

      // Divider/Horizontal Rule
      if (line.trim() === "---") {
        flushList();
        elements.push(<hr key={`hr-${key++}`} className="border-glass my-6" />);
        continue;
      }

      // Alerts/Callouts (> [!NOTE] or > [!IMPORTANT] or > [!WARNING])
      if (line.trim().startsWith(">")) {
        flushList();
        let alertType = "note";
        let cleanText = line.replace(/^>\s*/, "");
        
        // Peek if it's a GitHub style alert
        if (cleanText.includes("[!NOTE]")) {
          alertType = "note";
          cleanText = cleanText.replace(/\[!NOTE\]/g, "");
        } else if (cleanText.includes("[!IMPORTANT]") || cleanText.includes("[!CAUTION]")) {
          alertType = "important";
          cleanText = cleanText.replace(/\[!IMPORTANT\]|\[!CAUTION\]/g, "");
        } else if (cleanText.includes("[!WARNING]") || cleanText.includes("[!TIP]")) {
          alertType = "warning";
          cleanText = cleanText.replace(/\[!WARNING\]|\[!TIP\]/g, "");
        }

        // Gather consecutive quotes if any
        let quoteLines = [cleanText];
        while (i + 1 < lines.length && lines[i + 1].trim().startsWith(">")) {
          i++;
          quoteLines.push(lines[i].replace(/^>\s*/, ""));
        }

        const quoteContentStr = quoteLines.join("<br/>");
        const alertClass =
          alertType === "important" ? "markdown-alert-important" :
          alertType === "warning" ? "markdown-alert-warning" :
          "markdown-alert-note";

        elements.push(
          <div key={`alert-${key++}`} className={`markdown-alert p-4 rounded-lg border my-4 ${alertClass}`}>
            <span className="font-semibold uppercase tracking-wider text-[11px] block mb-1">
              {alertType === "important" ? "⚠ critical" : alertType === "warning" ? "✦ optimized tip" : "✦ system note"}
            </span>
            <div dangerouslySetInnerHTML={{ __html: formatInline(quoteContentStr) }} />
          </div>
        );
        continue;
      }

      // Bullet points
      const listMatch = line.match(/^(\s*)[-*+]\s+(.*)/);
      if (listMatch) {
        inList = true;
        listItems.push(listMatch[2]);
        continue;
      }

      // If we were in a list and this is not a list line, flush list
      if (inList && !listMatch) {
        flushList();
      }

      // Paragraph / Regular Text
      if (line.trim() !== "") {
        elements.push(
          <p
            key={`p-${key++}`}
            className="markdown-paragraph mb-4"
            dangerouslySetInnerHTML={{ __html: formatInline(line) }}
          />
        );
      }
    }

    // Flush any trailing list
    flushList();

    return elements;
  };

  return <div className="markdown-body space-y-1">{parseMarkdown(content)}</div>;
}
