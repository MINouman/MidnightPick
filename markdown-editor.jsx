// ── Markdown Editor with Preview ────────────────────────────
function MarkdownEditor({ value, onChange, placeholder = "Enter markdown content..." }) {
  const [preview, setPreview] = useState(false);

  const insertMarkdown = (before, after = '') => {
    const textarea = document.querySelector('[data-markdown-input]');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || 'text';
    const newValue = value.substring(0, start) + before + selected + after + value.substring(end);

    onChange({ target: { value: newValue } });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const formatTools = [
    { icon: 'fa-bold', title: 'Bold', action: () => insertMarkdown('**', '**') },
    { icon: 'fa-italic', title: 'Italic', action: () => insertMarkdown('*', '*') },
    { icon: 'fa-heading', title: 'Heading', action: () => insertMarkdown('## ', '') },
    { icon: 'fa-list', title: 'Bullet List', action: () => insertMarkdown('- ', '') },
    { icon: 'fa-list-ol', title: 'Numbered List', action: () => insertMarkdown('1. ', '') },
    { icon: 'fa-link', title: 'Link', action: () => insertMarkdown('[', '](url)') },
    { icon: 'fa-code', title: 'Code', action: () => insertMarkdown('`', '`') },
  ];

  const renderedHtml = typeof marked !== 'undefined' ? marked(value) : value;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {formatTools.map((tool, i) => (
            <button
              key={i}
              type="button"
              title={tool.title}
              onClick={tool.action}
              className="btn btn-sm"
              style={{
                padding: '6px 10px',
                background: 'rgba(255,145,0,0.1)',
                border: '1px solid rgba(255,145,0,0.3)',
                borderRadius: 4,
                cursor: 'pointer',
                color: 'var(--orange)',
                fontSize: 12,
              }}
            >
              <i className={`fa ${tool.icon}`} style={{ fontSize: 11 }} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className="btn btn-sm"
          style={{
            padding: '6px 12px',
            background: preview ? 'var(--orange)' : 'transparent',
            color: preview ? 'white' : 'var(--orange)',
            border: `1px solid ${preview ? 'var(--orange)' : 'rgba(255,145,0,0.3)'}`,
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {preview ? 'Editing' : 'Preview'}
        </button>
      </div>

      {preview ? (
        <div
          style={{
            background: 'var(--bg-soft)',
            border: '1px solid var(--text-08)',
            borderRadius: 8,
            padding: 16,
            minHeight: 300,
            fontSize: 14,
            lineHeight: 1.7,
            color: 'var(--text)',
          }}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      ) : (
        <textarea
          data-markdown-input
          className="input"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={12}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 13,
            resize: 'vertical',
          }}
        />
      )}

      <div style={{ fontSize: 11, color: 'var(--text-65)', marginTop: 12, padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: 6 }}>
        <strong>Markdown Quick Guide:</strong>
        <div style={{ marginTop: 8 }}>
          <div>**bold** → <strong>bold</strong></div>
          <div>*italic* → <em>italic</em></div>
          <div>## Heading → Large title</div>
          <div>- List item → Bullet point</div>
          <div>1. List item → Numbered point</div>
          <div>[Link](url) → Clickable link</div>
          <div>`code` → Inline code</div>
        </div>
      </div>
    </div>
  );
}

// ── Markdown Renderer ───────────────────────────────────────
function MarkdownRenderer({ content }) {
  if (!content) return null;
  const renderedHtml = typeof marked !== 'undefined' ? marked(content) : content;
  return (
    <div
      style={{
        fontSize: 14,
        lineHeight: 1.8,
        color: 'var(--text)',
        wordWrap: 'break-word',
      }}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
