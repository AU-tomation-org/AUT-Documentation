/**
 * inject.js — TwinCAT DocNav enhancer
 * ─────────────────────────────────────────────────────────────
 * Injected into every Beckhoff-generated HTM page inside the iframe.
 * Applies visual enhancements:
 *   - Wider tables and corrected column widths
 *   - Hides invasive Beckhoff header banner
 *   - Dark mode support (toggled by the parent frame)
 *   - Clickable method/property names in Members tables
 *
 * Communication with the parent frame via window.parent.postMessage.
 * ─────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // Guard — run only once
  if (window.__TC3NAV_INJECTED__) return;
  window.__TC3NAV_INJECTED__ = true;

  // ── Nav info passed from parent ────────────────────────────
  const NAV = window.__TC3NAV__ || {};

  function navigateParentByLabel(label) {
    window.parent.postMessage({ type: 'tc3nav:navigateByLabel', label }, '*');
  }

  // ── Make Implements / Extends names clickable ─────────────
  // Linkifies space-separated type names in the overview table rows whose
  // <th> id starts with "Implements_" or "Extends_", using the full allNames
  // list (all pages in the doc set) passed from index.html.
  function linkifyExtendsImplements() {
    const allNames = new Set(NAV.allNames || []);
    if (allNames.size === 0) return;

    const overviewTable = document.querySelector('table');
    if (!overviewTable) return;

    overviewTable.querySelectorAll('tr').forEach(row => {
      const th = row.querySelector('th');
      if (!th) return;
      const thId = th.getAttribute('id') || '';
      if (!thId.startsWith('Implements_') && !thId.startsWith('Extends_')) return;

      const td = row.querySelector('td');
      if (!td) return;
      const font = td.querySelector('font') || td;
      const text = font.textContent.trim();
      if (!text) return;

      const names = text.split(/\s+/).filter(n => n);
      if (!names.some(n => allNames.has(n.toLowerCase()))) return;

      font.textContent = '';
      names.forEach((name, i) => {
        if (i > 0) font.appendChild(document.createTextNode(' '));
        if (allNames.has(name.toLowerCase())) {
          const span = document.createElement('span');
          span.textContent = name;
          span.style.cursor = 'pointer';
          span.style.color = '#0055cc';
          span.style.textDecoration = 'underline';
          span.title = `Open ${name}`;
          span.addEventListener('click', () => navigateParentByLabel(name));
          font.appendChild(span);
        } else {
          font.appendChild(document.createTextNode(name));
        }
      });
    });
  }

  // ── Make method names in tables clickable ──────────────────
  // Linkifies only names that correspond to actual child pages,
  // using the childNames list passed from index.html.
  function linkifyMethodTable() {
    const childNames = new Set(NAV.childNames || []);
    if (childNames.size === 0) return;

    document.querySelectorAll('h2, h3').forEach(heading => {
      if (!/^(methods|members|properties)$/i.test(heading.textContent.trim())) return;

      let el = heading.nextElementSibling;
      while (el && el.tagName !== 'TABLE') el = el.nextElementSibling;
      if (!el) return;

      [...el.querySelectorAll('tr')]
        .filter(r => r.querySelector('td'))
        .forEach(row => {
          const firstCell = row.querySelectorAll('td')[0];
          if (!firstCell) return;
          const font = firstCell.querySelector('font') || firstCell;
          const name = font.textContent.trim();
          if (!name) return;

          if (!childNames.has(name.toLowerCase())) return;

          font.style.cursor = 'pointer';
          font.style.color = '#0055cc';
          font.style.textDecoration = 'underline';
          font.title = `Open ${name}`;
          font.addEventListener('click', () => navigateParentByLabel(name));
        });
    });
  }

  // ── Inject styles ──────────────────────────────────────────
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Widen Beckhoff tables from the default 50% to 90% */
      table, .standardborder {
        width: 90% !important;
      }
      /* Column widths for Beckhoff data tables (IDs are stable across all HTM files) */
      th[id^="Inherited_"] { width: 90px !important; white-space: nowrap !important; }
      th[id^="Comment_"]   { width: auto !important; }

      /* Hide the invasive Beckhoff "TwinCAT Documentation Generation" banner */
      .header {
        display: none !important;
      }
      /* Hide the unused Beckhoff placeholder canvas (always 100×100 px, never drawn into) */
      #ClassDiagramCanvas {
        display: none !important;
      }

      /* ── Dark theme ── */
      html.tc3nav-dark body {
        background: #1e1e1e !important;
        color: #d4d4d4 !important;
      }
      /* Override all Beckhoff hardcoded colors (font tags, inline styles, CSS classes) */
      html.tc3nav-dark body * {
        color: #d4d4d4 !important;
      }
      /* Specific overrides — come after body* so win on equal specificity */
      html.tc3nav-dark a { color: #4d9fec !important; }
      html.tc3nav-dark td, html.tc3nav-dark th {
        background: #252526 !important;
        border-color: #3c3c3c !important;
      }
      html.tc3nav-dark th {
        background: #555555 !important;
        color: #ffffff !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Apply / remove dark theme class ──────────────────────
  function applyTheme(dark) {
    document.documentElement.classList.toggle('tc3nav-dark', dark);
    window.__TC3_DARK = dark;
    window.__tc3nav_redrawAll?.();
  }

  // ── Main ──────────────────────────────────────────────────
  function init() {
    injectStyles();
    applyTheme(localStorage.getItem('tc3nav-theme') === 'dark');
    linkifyMethodTable();
    linkifyExtendsImplements();
    requestAnimationFrame(() =>
      window.parent.postMessage({ type: 'tc3nav:ready' }, '*')
    );
  }

  // Listen for theme changes from the parent frame
  window.addEventListener('message', e => {
    if (e.data?.type === 'tc3nav:theme') applyTheme(e.data.dark);
  });

  // pageshow fires on normal load AND on bfcache restore (back/forward).
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      window.parent.postMessage({ type: 'tc3nav:reinject', url: location.href }, '*');
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
