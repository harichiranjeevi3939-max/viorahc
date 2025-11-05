import React from 'react';

// This is a browser-only component, so we can safely reference the window object.
const katex = (window as any).katex;

// Fix: Replaced JSX.Element with React.ReactElement to resolve 'Cannot find namespace JSX' error.
const renderWithLatex = (text: string, isBlock: boolean): (React.ReactElement | string)[] => {
    if (!katex) {
        return [text]; // Return plain text if KaTeX is not available
    }

    try {
        const renderedHtml = katex.renderToString(text, {
            throwOnError: false,
            displayMode: isBlock,
        });
        return [<span key={text} dangerouslySetInnerHTML={{ __html: renderedHtml }} />];
    } catch (error) {
        console.error("KaTeX rendering error:", error);
        return [isBlock ? `$$${text}$$` : `$${text}$`]; // Return original text on error
    }
}

// Fix: Replaced JSX.Element with React.ReactElement to resolve 'Cannot find namespace JSX' error.
const renderLineContent = (line: string): (React.ReactElement | string)[] => {
    // This regex handles **bold**, *italic*, and both inline $...$ and block $$...$$ LaTeX
    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|\\\$[\d\.,]+|\$\$[\s\S]*?\$\$|\$.*?\$)/g);

    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={index}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('$$') && part.endsWith('$$')) {
            const content = renderWithLatex(part.slice(2, -2), true);
            return <React.Fragment key={index}>{content}</React.Fragment>;
        }
        if (part.startsWith('$') && part.endsWith('$')) {
            const content = part.slice(1, -1);
            // Smart Heuristic: If content is just a number/currency, it's probably not LaTeX.
            // This prevents KaTeX from erroring on things like "$50".
            if (/^[\d\.,\s]+$/.test(content)) {
                return part;
            }
            const rendered = renderWithLatex(content, false);
            return <React.Fragment key={index}>{rendered}</React.Fragment>;
        }
        if (part.startsWith('\\$')) {
            return part.slice(1); // Render the escaped dollar sign as a literal
        }
        return part;
    });
};


// A simple component to render basic markdown
// Fix: Explicitly typed MarkdownRenderer as a React.FC for better type safety and consistency.
export const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const blocks = text.split('\n\n'); // Split by double newlines to separate paragraphs and lists

    return (
        <>
            {blocks.map((block, i) => {
                // Handle block-level LaTeX first
                if (block.trim().startsWith('$$') && block.trim().endsWith('$$')) {
                     return <div key={`latex-block-${i}`}>{renderWithLatex(block.trim().slice(2, -2), true)}</div>;
                }

                const lines = block.split('\n');

                // Check for headings in single-line blocks
                if (lines.length === 1 && lines[0].startsWith('#')) {
                    const line = lines[0];
                    if (line.startsWith('### ')) {
                        return <h3 key={`h3-${i}`} className="text-lg font-semibold mt-3 mb-1">{renderLineContent(line.substring(4))}</h3>;
                    }
                    if (line.startsWith('## ')) {
                        return <h2 key={`h2-${i}`} className="text-xl font-bold mt-4 mb-2">{renderLineContent(line.substring(3))}</h2>;
                    }
                    if (line.startsWith('# ')) {
                        return <h1 key={`h1-${i}`} className="text-2xl font-extrabold mt-5 mb-3">{renderLineContent(line.substring(2))}</h1>;
                    }
                }
                
                // Check if the block is a list
                if (lines.every(line => line.trim().startsWith('- '))) {
                    return (
                        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-2 pl-2">
                            {lines.map((line, j) => (
                                <li key={`li-${j}`}>{renderLineContent(line.substring(line.indexOf('- ') + 2))}</li>
                            ))}
                        </ul>
                    );
                }

                // Otherwise, treat as a paragraph block
                return (
                    <p key={`p-${i}`} className="my-1">
                        {lines.map((line, j) => (
                            <React.Fragment key={j}>
                                {renderLineContent(line)}
                                {j < lines.length - 1 && <br />}
                            </React.Fragment>
                        ))}
                    </p>
                );
            })}
        </>
    );
};