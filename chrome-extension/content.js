/**
 * Swiggy Instamart Poll Bridge - Content Script
 *
 * Detects poll_data URL parameter on swiggy.com/instamart pages,
 * then automates clicking "Add" buttons for each polled item.
 */

(function () {
  'use strict';

  const POLL_DATA_KEY = 'poll_data';
  const ADD_BTN_SELECTOR = (sku) => `[data-testid*="item_${sku}_add_btn"]`;
  const CLICK_DELAY_MS = 500;
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2000;

  // ─── Overlay Manager ─────────────────────────────────────────────────────

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'poll-bridge-overlay';
    overlay.innerHTML = `
      <div class="poll-bridge-card">
        <div class="poll-bridge-spinner"></div>
        <div class="poll-bridge-title">Syncing your group order</div>
        <div class="poll-bridge-subtitle" id="poll-bridge-status">Preparing...</div>
        <div class="poll-bridge-progress">
          <div class="poll-bridge-progress-bar" id="poll-bridge-progress-bar"></div>
        </div>
        <div class="poll-bridge-items" id="poll-bridge-items"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function updateOverlayStatus(text) {
    const el = document.getElementById('poll-bridge-status');
    if (el) el.textContent = text;
  }

  function updateOverlayProgress(current, total) {
    const bar = document.getElementById('poll-bridge-progress-bar');
    if (bar) bar.style.width = `${(current / total) * 100}%`;
  }

  function addItemToOverlay(sku, name, status) {
    const container = document.getElementById('poll-bridge-items');
    if (!container) return;
    const item = document.createElement('div');
    item.className = `poll-bridge-item poll-bridge-item--${status}`;
    item.id = `poll-bridge-item-${sku}`;
    item.textContent = `${name || sku} - ${status === 'pending' ? 'Waiting' : status === 'adding' ? 'Adding...' : status === 'done' ? 'Added' : 'Failed'}`;
    container.appendChild(item);
  }

  function updateItemStatus(sku, status) {
    const item = document.getElementById(`poll-bridge-item-${sku}`);
    if (!item) return;
    item.className = `poll-bridge-item poll-bridge-item--${status}`;
    const statusLabels = {
      pending: 'Waiting',
      adding: 'Adding...',
      done: 'Added',
      failed: 'Failed',
    };
    item.textContent = item.textContent.split(' - ')[0] + ' - ' + (statusLabels[status] || status);
  }

  function removeOverlay() {
    const overlay = document.getElementById('poll-bridge-overlay');
    if (overlay) overlay.remove();
  }

  // ─── URL Parsing ─────────────────────────────────────────────────────────

  function getPollData() {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(POLL_DATA_KEY);
    if (!raw) return null;

    try {
      const data = JSON.parse(decodeURIComponent(raw));
      if (!Array.isArray(data)) return null;
      return data.filter(
        (item) => item.sku && typeof item.sku === 'string' && item.qty > 0
      );
    } catch (e) {
      console.error('[Poll Bridge] Failed to parse poll_data:', e);
      return null;
    }
  }

  // ─── Automation ───────────────────────────────────────────────────────────

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function findAddButton(sku, retries = MAX_RETRIES) {
    for (let attempt = 0; attempt < retries; attempt++) {
      const selector = ADD_BTN_SELECTOR(sku);
      const btn = document.querySelector(selector);
      if (btn) return btn;

      // Try scrolling to find the item (Swiggy uses virtual scrolling)
      await delay(RETRY_DELAY_MS);
    }
    return null;
  }

  async function addItemToCart(sku, qty) {
    const btn = await findAddButton(sku);
    if (!btn) return false;

    for (let i = 0; i < qty; i++) {
      // Re-query the button each time since Swiggy may re-render
      const currentBtn = document.querySelector(ADD_BTN_SELECTOR(sku));
      if (!currentBtn) return false;

      currentBtn.click();
      if (i < qty - 1) {
        await delay(CLICK_DELAY_MS);
      }
    }
    return true;
  }

  async function processPollData(pollData) {
    createOverlay();

    const totalItems = pollData.reduce((sum, item) => sum + item.qty, 0);
    let completedItems = 0;

    // Add all items to the overlay as pending
    pollData.forEach((item) => {
      addItemToOverlay(item.sku, item.name || item.sku, 'pending');
    });

    updateOverlayStatus(`Adding ${totalItems} item(s) to cart...`);

    for (const entry of pollData) {
      updateItemStatus(entry.sku, 'adding');
      updateOverlayStatus(`Adding ${entry.sku} (x${entry.qty})...`);

      const success = await addItemToCart(entry.sku, entry.qty);

      completedItems += entry.qty;
      updateOverlayProgress(completedItems, totalItems);
      updateItemStatus(entry.sku, success ? 'done' : 'failed');

      // Small delay between different items
      await delay(300);
    }

    updateOverlayStatus('All done! Your cart is ready.');
    updateOverlayProgress(totalItems, totalItems);

    // Clean up the URL to prevent re-processing on refresh
    cleanUrl();

    // Auto-dismiss overlay after 4 seconds
    setTimeout(removeOverlay, 4000);
  }

  function cleanUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete(POLL_DATA_KEY);
    window.history.replaceState({}, '', url.toString());
  }

  // ─── Initialization ──────────────────────────────────────────────────────

  function init() {
    const pollData = getPollData();
    if (!pollData || pollData.length === 0) return;

    console.log(
      '[Poll Bridge] Found poll data:',
      pollData.map((i) => `${i.sku} x${i.qty}`).join(', ')
    );

    // Wait for the page to fully load before starting automation
    if (document.readyState === 'complete') {
      processPollData(pollData);
    } else {
      window.addEventListener('load', () => processPollData(pollData));
    }
  }

  init();
})();
