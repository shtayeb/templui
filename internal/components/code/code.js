import "./highlight.js";

(function () {
  'use strict';
  
  // Highlight code blocks on page load and mutations
  function highlightCode(codeBlock) {
    if (codeBlock && window.hljs && !codeBlock.classList.contains('hljs')) {
      window.hljs.highlightElement(codeBlock);
    }
  }
  
  // Copy button click delegation
  document.addEventListener('click', (e) => {
    const copyButton = e.target.closest('[data-tui-code-copy-button]');
    if (!copyButton) return;
    
    const component = copyButton.closest('[data-tui-code-component]');
    if (!component) return;
    
    const codeBlock = component.querySelector('[data-tui-code-block]');
    const iconCheck = component.querySelector('[data-tui-code-icon-check]');
    const iconClipboard = component.querySelector('[data-tui-code-icon-clipboard]');
    
    if (!codeBlock || !iconCheck || !iconClipboard) return;
    
    const codeToCopy = codeBlock.textContent || '';
    
    const showCopied = () => {
      iconCheck.style.display = 'inline';
      iconClipboard.style.display = 'none';
      setTimeout(() => {
        iconCheck.style.display = 'none';
        iconClipboard.style.display = 'inline';
      }, 2000);
    };
    
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(codeToCopy).then(showCopied).catch(() => {
        fallbackCopy(codeToCopy, showCopied);
      });
    } else {
      fallbackCopy(codeToCopy, showCopied);
    }
  });
  
  function fallbackCopy(text, callback) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      if (document.execCommand('copy')) callback();
    } catch (err) {
      console.error('Copy failed', err);
    }
    document.body.removeChild(textArea);
  }
  
  // Initial highlight and observe for new code blocks
  function initHighlighting() {
    document.querySelectorAll('[data-tui-code-block]').forEach(highlightCode);
  }
  
  // Wait for hljs to be available
  function waitForHljs() {
    if (window.hljs) {
      initHighlighting();
      // Observe for new code blocks
      new MutationObserver(() => {
        document.querySelectorAll('[data-tui-code-block]:not(.hljs)').forEach(highlightCode);
      }).observe(document.body, { childList: true, subtree: true });
    } else {
      setTimeout(waitForHljs, 100);
    }
  }
  
  document.addEventListener('DOMContentLoaded', waitForHljs);
})();
