import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// react-markdown never renders raw HTML and strips unsafe URLs, so user input is safe here.
// `untrusted` (AI output) also drops images, which would load a URL (and leak
// whatever is in it) as soon as the text renders, and marks links as untrusted.
export function Markdown({ children, untrusted = false }: { children: string; untrusted?: boolean }) {
  return (
    <div className="text-sm leading-relaxed break-words [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:text-muted-foreground [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:font-mono [&_h1]:mt-3 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:font-medium [&_input]:mr-1.5 [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:bg-muted [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul:has(input)]:list-none [&_ul:has(input)]:pl-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        disallowedElements={untrusted ? ["img"] : undefined}
        components={
          untrusted
            ? {
                a: ({ href, children: text }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer nofollow">
                    {text}
                  </a>
                ),
              }
            : undefined
        }
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
