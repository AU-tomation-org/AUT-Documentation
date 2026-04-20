/**
 * inject.js — TwinCAT DocNav enhancer
 * ─────────────────────────────────────────────────────────────
 * This script is injected into every Beckhoff-generated HTM page
 * when viewed inside the index.html iframe. It adds:
 *
 *   1. A top navigation bar with:
 *      - breadcrumb (clickable, navigates the parent iframe)
 *      - "↑ Up" button to go to parent page
 *      - current page title / type badge
 *
 *   2. Clickable method names in the Members table
 *      (navigates to the method's own page if available)
 *
 * It never touches the original HTM file on disk.
 * Communication with the parent frame is done via window.parent.postMessage.
 * ─────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // Guard — run only once
  if (window.__TC3NAV_INJECTED__) return;
  window.__TC3NAV_INJECTED__ = true;

  // ── Nav info passed from parent ────────────────────────────
  const NAV = window.__TC3NAV__ || {};

  // ── Helpers ────────────────────────────────────────────────
  function ce(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function navigateParent(path) {
    window.parent.postMessage({ type: 'tc3nav:navigate', path }, '*');
  }

  function navigateParentByLabel(label) {
    window.parent.postMessage({ type: 'tc3nav:navigateByLabel', label }, '*');
  }

  // ── Type badge label ───────────────────────────────────────
  function typeBadge() {
    const h1 = document.querySelector('h1');
    if (!h1) return null;
    const text = h1.textContent.trim();
    const m = text.match(/^(Function Block|Method|Interface|Function|Program|GVL|Global Variable List|Property)\s/i);
    return m ? m[1] : null;
  }

  // ── Build the nav bar ──────────────────────────────────────
  function buildNavBar() {
    const bar = ce('div', 'tc3nav-bar');

    // Left: breadcrumb
    const bc = ce('div', 'tc3nav-breadcrumb');

    const homeBtn = ce('span', 'tc3nav-bc-part tc3nav-clickable', '⌂');
    homeBtn.title = 'Back to index';
    homeBtn.addEventListener('click', () =>
      window.parent.postMessage({ type: 'tc3nav:home' }, '*')
    );
    bc.appendChild(homeBtn);

    if (NAV.parentPath || NAV.parentLabel) {
      const sep1 = ce('span', 'tc3nav-sep', ' / ');
      bc.appendChild(sep1);
      const parentBtn = ce('span', 'tc3nav-bc-part tc3nav-clickable',
        NAV.parentLabel || '…');
      parentBtn.addEventListener('click', () =>
        NAV.parentPath
          ? navigateParent(NAV.parentPath)
          : navigateParentByLabel(NAV.parentLabel)
      );
      bc.appendChild(parentBtn);
    }

    if (NAV.currentShort) {
      const sep2 = ce('span', 'tc3nav-sep', ' / ');
      bc.appendChild(sep2);
      const curr = ce('span', 'tc3nav-bc-part tc3nav-active', NAV.currentShort);
      bc.appendChild(curr);
    }

    bar.appendChild(bc);

    // Right: badge + up button
    const right = ce('div', 'tc3nav-right');

    const badge = typeBadge();
    if (badge) {
      const b = ce('span', 'tc3nav-badge', badge);
      right.appendChild(b);
    }

    if (NAV.parentPath || NAV.parentLabel) {
      const upBtn = ce('button', 'tc3nav-up', '↑ Up');
      upBtn.title = 'Go to parent page';
      upBtn.addEventListener('click', () =>
        NAV.parentPath
          ? navigateParent(NAV.parentPath)
          : navigateParentByLabel(NAV.parentLabel)
      );
      right.appendChild(upBtn);
    }

    bar.appendChild(right);
    return bar;
  }

  // ── Make method names in tables clickable ──────────────────
  // Linkifies only names that correspond to actual child pages,
  // using the childNames list passed from index.html.
  function linkifyMethodTable() {
    const childNames = new Set(NAV.childNames || []);
    if (childNames.size === 0) return; // no children → nothing to linkify

    document.querySelectorAll('h2, h3').forEach(heading => {
      if (!/^(methods|members)$/i.test(heading.textContent.trim())) return;

      // Find the next <table> sibling after this heading
      let el = heading.nextElementSibling;
      while (el && el.tagName !== 'TABLE') el = el.nextElementSibling;
      if (!el) return;

      // Rows with <td> (skip header rows with <th>)
      [...el.querySelectorAll('tr')]
        .filter(r => r.querySelector('td'))
        .forEach(row => {
          const firstCell = row.querySelectorAll('td')[0];
          if (!firstCell) return;
          const font = firstCell.querySelector('font') || firstCell;
          const name = font.textContent.trim();
          if (!name) return;

          // Only linkify if this name has an actual child page
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
      .tc3nav-bar {
        position: sticky;
        top: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #f5f5f5;
        border-bottom: 1px solid #cccccc;
        border-top: 3px solid #EF0000;
        padding: 4px 12px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 9pt;
        color: #000000;
        gap: 8px;
      }

      .tc3nav-breadcrumb {
        display: flex;
        align-items: center;
        gap: 2px;
        flex-wrap: wrap;
        overflow: hidden;
      }

      .tc3nav-bc-part {
        color: #666666;
        white-space: nowrap;
      }

      .tc3nav-clickable {
        cursor: pointer;
        transition: color 0.12s;
      }
      .tc3nav-clickable:hover { color: #EF0000; }

      .tc3nav-active {
        color: #000000;
        font-weight: bold;
      }

      .tc3nav-sep {
        color: #cccccc;
        user-select: none;
      }

      .tc3nav-right {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .tc3nav-badge {
        background: #ffffff;
        color: #666666;
        font-size: 8pt;
        padding: 1px 6px;
        border: 1px solid #cccccc;
        white-space: nowrap;
        font-family: Arial, Helvetica, sans-serif;
      }

      .tc3nav-up {
        background: #ffffff;
        border: 1px solid #cccccc;
        color: #000000;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 9pt;
        padding: 2px 8px;
        cursor: pointer;
        transition: all 0.12s;
        white-space: nowrap;
      }
      .tc3nav-up:hover {
        background: #EF0000;
        border-color: #EF0000;
        color: #ffffff;
      }

      /* Hide the invasive Beckhoff "TwinCAT Documentation Generation" banner */
      .header {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Main ──────────────────────────────────────────────────
  function init() {
    // Remove any previously injected bar (safe re-run after bfcache restore)
    document.querySelector('.tc3nav-bar')?.remove();

    injectStyles();

    const bar = buildNavBar();
    document.body.insertBefore(bar, document.body.firstChild);

    linkifyMethodTable();
  }

  // pageshow fires on normal load AND on bfcache restore (back/forward).
  // On bfcache restore (event.persisted === true) the DOM is intact but
  // inject.js did not re-run — we need to re-init manually.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      // Page restored from bfcache: notify parent to re-inject with fresh NAV info
      window.parent.postMessage({ type: 'tc3nav:reinject', url: location.href }, '*');
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();