const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

describe('setStatus', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    const virtualConsole = new jsdom.VirtualConsole();
    // Ignore tailwind error
    virtualConsole.on("jsdomError", (error) => {
      if (error.message.includes('tailwind is not defined')) return;
      // console.error(error);
    });

    dom = new JSDOM(html, {
      runScripts: "dangerously",
      url: "http://localhost/",
      virtualConsole
    });
    document = dom.window.document;
    window = dom.window;
  });

  it('should handle "cloud" status correctly', () => {
    window.setStatus('cloud');
    const offlineBanner = document.getElementById('offline-banner');
    const statusEl = document.getElementById('connection-status');

    expect(offlineBanner.classList.contains('hidden')).toBe(true);
    expect(statusEl.innerHTML).toContain('Cloud Sync On');
    expect(statusEl.innerHTML).toContain('text-emerald-500');
  });

  it('should handle "syncing" status correctly', () => {
    window.setStatus('syncing');
    const offlineBanner = document.getElementById('offline-banner');
    const statusEl = document.getElementById('connection-status');

    expect(offlineBanner.classList.contains('hidden')).toBe(true);
    expect(statusEl.innerHTML).toContain('Saving...');
    expect(statusEl.innerHTML).toContain('text-mightea-teal');
    expect(statusEl.innerHTML).toContain('animate-spin');
  });

  it('should handle "offline" (or any other) status correctly', () => {
    window.setStatus('offline');
    const offlineBanner = document.getElementById('offline-banner');
    const statusEl = document.getElementById('connection-status');

    expect(offlineBanner.classList.contains('hidden')).toBe(false);
    expect(statusEl.innerHTML).toContain('Offline');
    expect(statusEl.innerHTML).toContain('text-yellow-600');
  });
});
