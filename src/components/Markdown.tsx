import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

/** Render admin-authored Markdown safely: raw HTML is not rendered and output is sanitized. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-td">
      <ReactMarkdown rehypePlugins={[rehypeSanitize]} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
