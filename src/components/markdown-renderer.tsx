import { marked } from 'marked';
import styles from './markdown-renderer.module.css';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const html = marked(content) as string;

  // biome-ignore lint/security/noDangerouslySetInnerHtml: required for markdown rendering
  return <div className={styles.markdown} dangerouslySetInnerHTML={{ __html: html }} />;
}
