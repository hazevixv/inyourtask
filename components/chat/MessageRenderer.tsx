'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Code, Eye } from 'lucide-react';
import VoicePlayer from './VoicePlayer';
import FilePreview from './FilePreview';
import styles from './MessageRenderer.module.css';

interface MessageRendererProps {
  content: string | string[];
  msgType?: string;
  metadata?: {
    language?: string;
    chartData?: ChartData;
    threeDData?: any;
  };
  voiceData?: {
    audioUrl: string;
    duration: number;
  };
  attachments?: Array<{
    fileUrl: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    thumbnail?: string;
  }>;
}

interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'area';
  data: any[];
  xKey?: string;
  yKey?: string;
  nameKey?: string;
  colors?: string[];
  title?: string;
}

function normalizeMarkdownContent(value: string) {
  let next = value.replace(/\r\n/g, '\n');

  next = next.replace(/(^|[ \t])([1-9])(?:\uFE0F)?\u20E3[ \t]*/g, (match, prefix, number, offset, source) => {
    const before = source.slice(0, offset);
    const lineStart = before.lastIndexOf('\n') + 1;
    const textBeforeOnLine = before.slice(lineStart).trim();
    return textBeforeOnLine ? `\n${number}. ` : `${prefix}${number}. `;
  });

  if (/(^|\s)1\. [\s\S]*\s2\. [\s\S]*\s3\. /i.test(next)) {
    next = next
      .replace(/(:)\s*(?=1\. )/g, '$1\n\n')
      .replace(/([^\n])\s+([2-9]\. )/g, '$1\n$2');
  }

  return next.replace(/\n{3,}/g, '\n\n');
}

export default function MessageRenderer({ content, msgType = 'text', metadata, voiceData, attachments }: MessageRendererProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');

  // Normalize content - handle edge cases
  let normalizedContent = Array.isArray(content) ? content.join('') : content;
  if (typeof normalizedContent === 'string') {
    // If content is stored as array-like string (e.g., "['t','e','s','t']"), convert it
    if (normalizedContent.startsWith('[') && normalizedContent.includes("'")) {
      try {
        const parsed = JSON.parse(normalizedContent.replace(/'/g, '"'));
        if (Array.isArray(parsed)) {
          normalizedContent = parsed.join('');
        }
      } catch {}
    }
    // Remove excessive newlines that might cause vertical rendering
    normalizedContent = normalizeMarkdownContent(normalizedContent);
  }

  // File attachments rendering
  if (msgType === 'file' && attachments && attachments.length > 0) {
    return (
      <div>
        {normalizedContent && <div className={styles.textContent}>{normalizedContent}</div>}
        <FilePreview attachments={attachments} />
      </div>
    );
  }

  // Voice message rendering
  if (msgType === 'voice' && voiceData) {
    return <VoicePlayer audioUrl={voiceData.audioUrl} duration={voiceData.duration} />;
  }

  // AI/system messages often carry markdown while their msg_type is not "markdown".
  if (msgType === 'ai' || msgType === 'assistant') {
    msgType = 'markdown';
  }

  // Auto-detect content type if not specified
  if (msgType === 'text' || !msgType) {
    // Check if content looks like JSON chart data
    if (normalizedContent.trim().startsWith('{') && (normalizedContent.includes('"type"') && normalizedContent.includes('"data"'))) {
      try {
        const parsed = JSON.parse(normalizedContent);
        if (parsed.type && parsed.data) {
          msgType = 'chart';
          metadata = { chartData: parsed };
        }
      } catch {}
    }
    // Check if content has markdown syntax
    else if (
      normalizedContent.includes('**') ||
      normalizedContent.includes('##') ||
      normalizedContent.includes('```') ||
      /^\s*[-*]\s+/m.test(normalizedContent) ||
      /^\s*\d+\.\s+/m.test(normalizedContent) ||
      (normalizedContent.includes('[') && normalizedContent.includes(']('))
    ) {
      msgType = 'markdown';
    }
    // Check if content looks like HTML
    else if (normalizedContent.trim().startsWith('<') && normalizedContent.includes('>')) {
      msgType = 'html';
    }
  }

  // Markdown rendering
  if (msgType === 'markdown') {
    return (
      <div className={styles.markdownContent}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';
              const inline = !language;
              
              if (!inline && language) {
                try {
                  const code = String(children).replace(/\n$/, '');
                  const highlighted = Prism.highlight(
                    code,
                    Prism.languages[language] || Prism.languages.javascript,
                    language
                  );
                  return (
                    <pre className={styles.codeBlock}>
                      <code dangerouslySetInnerHTML={{ __html: highlighted }} />
                    </pre>
                  );
                } catch {
                  return <code className={styles.inlineCode} {...props}>{children}</code>;
                }
              }
              return <code className={styles.inlineCode} {...props}>{children}</code>;
            },
            a({ node, children, href, ...props }: any) {
              return <a href={href} target="_blank" rel="noopener noreferrer" className={styles.link} {...props}>{children}</a>;
            },
            table({ node, children, ...props }: any) {
              return <div className={styles.tableWrapper}><table className={styles.table} {...props}>{children}</table></div>;
            },
            p({ node, children, ...props }: any) {
              return <p className={styles.paragraph} {...props}>{children}</p>;
            },
            ul({ node, children, ...props }: any) {
              return <ul className={styles.list} {...props}>{children}</ul>;
            },
            ol({ node, children, ...props }: any) {
              return <ol className={styles.list} {...props}>{children}</ol>;
            },
            li({ node, children, ...props }: any) {
              return <li className={styles.listItem} {...props}>{children}</li>;
            }
          }}
        >
          {normalizedContent}
        </ReactMarkdown>
      </div>
    );
  }

  // Code rendering with syntax highlighting
  if (msgType === 'code') {
    const language = metadata?.language || 'javascript';
    try {
      const highlighted = Prism.highlight(
        normalizedContent,
        Prism.languages[language] || Prism.languages.javascript,
        language
      );
      return (
        <div className={styles.codeContainer}>
          <div className={styles.codeHeader}>
            <span className={styles.codeLanguage}>{language}</span>
          </div>
          <pre className={styles.codeBlock}>
            <code dangerouslySetInnerHTML={{ __html: highlighted }} />
          </pre>
        </div>
      );
    } catch {
      return <pre className={styles.codeBlock}><code>{normalizedContent}</code></pre>;
    }
  }

  // HTML rendering with sanitization
  if (msgType === 'html') {
    const sanitized = DOMPurify.sanitize(normalizedContent, {
      ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'strong', 'em', 'br', 'a'],
      ALLOWED_ATTR: ['class', 'style', 'href', 'target']
    });

    return (
      <div className={styles.htmlContainer}>
        <div className={styles.toggleButtons}>
          <button
            className={`${styles.toggleBtn} ${viewMode === 'visual' ? styles.toggleBtnActive : ''}`}
            onClick={() => setViewMode('visual')}
          >
            <Eye size={14} /> Visual
          </button>
          <button
            className={`${styles.toggleBtn} ${viewMode === 'code' ? styles.toggleBtnActive : ''}`}
            onClick={() => setViewMode('code')}
          >
            <Code size={14} /> Code
          </button>
        </div>
        
        {viewMode === 'visual' ? (
          <div className={styles.htmlPreview} dangerouslySetInnerHTML={{ __html: sanitized }} />
        ) : (
          <pre className={styles.codeBlock}>
            <code>{normalizedContent}</code>
          </pre>
        )}
      </div>
    );
  }

  // Chart rendering
  if (msgType === 'chart' && metadata?.chartData) {
    const chartData = metadata.chartData;
    const colors = chartData.colors || ['#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

    return (
      <div className={styles.chartContainer}>
        {chartData.title && <h4 className={styles.chartTitle}>{chartData.title}</h4>}
        <ResponsiveContainer width="100%" height={300}>
          {chartData.type === 'bar' && (
            <BarChart data={chartData.data}>
              <XAxis dataKey={chartData.xKey || 'name'} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={chartData.yKey || 'value'} fill={colors[0]} />
            </BarChart>
          )}
          
          {chartData.type === 'line' && (
            <LineChart data={chartData.data}>
              <XAxis dataKey={chartData.xKey || 'name'} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={chartData.yKey || 'value'} stroke={colors[0]} strokeWidth={2} />
            </LineChart>
          )}
          
          {chartData.type === 'pie' && (
            <PieChart>
              <Pie
                data={chartData.data}
                dataKey={chartData.yKey || 'value'}
                nameKey={chartData.nameKey || 'name'}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill={colors[0]}
                label
              />
              <Tooltip />
              <Legend />
            </PieChart>
          )}
          
          {chartData.type === 'area' && (
            <AreaChart data={chartData.data}>
              <XAxis dataKey={chartData.xKey || 'name'} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey={chartData.yKey || 'value'} stroke={colors[0]} fill={colors[0]} fillOpacity={0.3} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  }

  // Default text rendering
  return <div className={styles.textContent}>{normalizedContent}</div>;
}
