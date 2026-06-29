/* Built from markdown-editor.jsx. Run: node scripts/build-jsx.js */
function MarkdownEditor({
  value,
  onChange,
  placeholder = "Enter markdown content..."
}) {
  var [preview, setPreview] = useState(false);
  var [error, setError] = useState(null);
  var insertMarkdown = (before, after = '') => {
    try {
      var textarea = document.querySelector('[data-markdown-input]');
      if (!textarea) return;
      var start = textarea.selectionStart;
      var end = textarea.selectionEnd;
      var selected = value.substring(start, end) || 'text';
      var newValue = value.substring(0, start) + before + selected + after + value.substring(end);
      onChange({
        target: {
          value: newValue
        }
      });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
      }, 0);
    } catch (err) {
      console.error('Error inserting markdown:', err);
      setError('Failed to insert formatting');
    }
  };
  var formatTools = [{
    icon: 'fa-bold',
    title: 'Bold',
    action: () => insertMarkdown('**', '**')
  }, {
    icon: 'fa-italic',
    title: 'Italic',
    action: () => insertMarkdown('*', '*')
  }, {
    icon: 'fa-heading',
    title: 'Heading',
    action: () => insertMarkdown('## ', '')
  }, {
    icon: 'fa-list',
    title: 'Bullet List',
    action: () => insertMarkdown('- ', '')
  }, {
    icon: 'fa-list-ol',
    title: 'Numbered List',
    action: () => insertMarkdown('1. ', '')
  }, {
    icon: 'fa-link',
    title: 'Link',
    action: () => insertMarkdown('[', '](url)')
  }, {
    icon: 'fa-code',
    title: 'Code',
    action: () => insertMarkdown('`', '`')
  }];
  var renderedHtml = (() => {
    try {
      if (typeof marked === 'undefined') return value;
      if (typeof marked.parse === 'function') return marked.parse(value);
      if (typeof marked === 'function') return marked(value);
      return value;
    } catch (err) {
      console.error('Markdown rendering error:', err);
      setError('Error rendering preview');
      return value;
    }
  })();
  return React.createElement("div", null, error && React.createElement("div", {
    style: {
      padding: '8px 12px',
      background: 'rgba(229,115,115,0.1)',
      border: '1px solid #e57373',
      borderRadius: 6,
      marginBottom: 12,
      fontSize: 12,
      color: '#e57373'
    }
  }, error), React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 8,
      flexWrap: 'wrap'
    }
  }, React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      alignItems: 'center'
    }
  }, formatTools.map((tool, i) => React.createElement("button", {
    key: i,
    type: "button",
    title: tool.title,
    onClick: tool.action,
    className: "btn btn-sm",
    style: {
      padding: '6px 10px',
      background: 'rgba(255,145,0,0.1)',
      border: '1px solid rgba(255,145,0,0.3)',
      borderRadius: 4,
      cursor: 'pointer',
      color: 'var(--orange)',
      fontSize: 12
    }
  }, React.createElement("i", {
    className: `fa ${tool.icon}`,
    style: {
      fontSize: 11
    }
  })))), React.createElement("button", {
    type: "button",
    onClick: () => setPreview(!preview),
    className: "btn btn-sm",
    style: {
      padding: '6px 12px',
      background: preview ? 'var(--orange)' : 'transparent',
      color: preview ? 'white' : 'var(--orange)',
      border: `1px solid ${preview ? 'var(--orange)' : 'rgba(255,145,0,0.3)'}`,
      borderRadius: 4,
      cursor: 'pointer',
      fontSize: 12,
      fontWeight: 600
    }
  }, preview ? 'Editing' : 'Preview')), preview ? React.createElement("div", {
    style: {
      background: 'var(--bg-soft)',
      border: '1px solid var(--text-08)',
      borderRadius: 8,
      padding: 16,
      minHeight: 300,
      fontSize: 14,
      lineHeight: 1.7,
      color: 'var(--text)'
    },
    dangerouslySetInnerHTML: {
      __html: renderedHtml
    }
  }) : React.createElement("textarea", {
    "data-markdown-input": true,
    className: "input",
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    rows: 12,
    style: {
      fontFamily: "'DM Mono', monospace",
      fontSize: 13,
      resize: 'vertical'
    }
  }), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-65)',
      marginTop: 12,
      padding: '12px',
      background: 'rgba(0,0,0,0.1)',
      borderRadius: 6
    }
  }, React.createElement("strong", null, "Markdown Quick Guide:"), React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, React.createElement("div", null, "**bold** \u2192 ", React.createElement("strong", null, "bold")), React.createElement("div", null, "*italic* \u2192 ", React.createElement("em", null, "italic")), React.createElement("div", null, "## Heading \u2192 Large title"), React.createElement("div", null, "- List item \u2192 Bullet point"), React.createElement("div", null, "1. List item \u2192 Numbered point"), React.createElement("div", null, "[Link](url) \u2192 Clickable link"), React.createElement("div", null, "`code` \u2192 Inline code"))));
}
function MarkdownRenderer({
  content
}) {
  if (!content) return null;
  var renderedHtml = typeof marked !== 'undefined' ? typeof marked.parse === 'function' ? marked.parse(content) : marked(content) : content;
  return React.createElement("div", {
    style: {
      fontSize: 14,
      lineHeight: 1.8,
      color: 'var(--text)',
      wordWrap: 'break-word'
    },
    dangerouslySetInnerHTML: {
      __html: renderedHtml
    }
  });
}
