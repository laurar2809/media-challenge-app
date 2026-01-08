// public/js/app/utils/filterUtils.js

window.FilterUtils = (function () {
  function initSearchWithBadge({ input, badge, textSpan, onChange }) {
    if (!input) return;

    let timeout;

    input.addEventListener('input', function () {
      clearTimeout(timeout);
      const query = this.value.trim().toLowerCase();

      timeout = setTimeout(() => {
        if (typeof onChange === 'function') {
          onChange(query);
        }

        if (badge && textSpan) {
          if (query.length >= 2) {
            textSpan.textContent = query;
            badge.style.display = 'flex';
          } else {
            badge.style.display = 'none';
          }
        }
      }, 300);
    });
  }

  return {
    initSearchWithBadge
  };
})();
