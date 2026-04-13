const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

require('@testing-library/jest-dom');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('Clipboard Share Feature', () => {
    let dom;
    let showDialogMock;
    let writeTextMock;

    beforeEach(async () => {
        // Read index.html
        const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

        showDialogMock = jest.fn();
        writeTextMock = jest.fn();

        dom = new JSDOM(html, {
            runScripts: "dangerously",
            url: "http://example.com/#12345",
            beforeParse(window) {
                // Stub dependencies
                window.tailwind = { config: {} };

                Object.defineProperty(window, 'matchMedia', {
                    writable: true,
                    value: jest.fn().mockImplementation(query => ({
                        matches: false,
                        media: query,
                        onchange: null,
                        addListener: jest.fn(),
                        removeListener: jest.fn(),
                        addEventListener: jest.fn(),
                        removeEventListener: jest.fn(),
                        dispatchEvent: jest.fn(),
                    })),
                });

                window.navigator.clipboard = {
                    writeText: writeTextMock
                };

                window.fetch = jest.fn().mockResolvedValue({
                    ok: true,
                    json: async () => ({})
                });
            }
        });

        // Wait for JSDOM scripts to execute
        await new Promise(resolve => {
            dom.window.document.addEventListener('DOMContentLoaded', resolve);
            // Fallback resolve if DOMContentLoaded already fired
            setTimeout(resolve, 50);
        });

        // Override the showDialog function
        dom.window.showDialog = showDialogMock;

        dom.window.scrollBy = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should show wait message if dbId is missing', async () => {
        // Override dbId variable inside the JSDOM window
        dom.window.eval('dbId = null;');

        // Ensure writeText returns a promise to prevent "Cannot read properties of undefined (reading 'then')"
        // if for some reason the writeText branch is executed.
        writeTextMock.mockResolvedValueOnce(undefined);

        const shareBtn = dom.window.document.getElementById('btn-share');
        shareBtn.click();

        await new Promise(process.nextTick);

        expect(showDialogMock).toHaveBeenCalledWith({
            title: "Wait a second",
            message: "The database is still building. Wait until the sync icon is green."
        });
        expect(writeTextMock).not.toHaveBeenCalled();
    });

    test('should copy successfully and show success dialog', async () => {
        // Ensure dbId is truthy
        dom.window.eval('dbId = "12345";');
        writeTextMock.mockResolvedValueOnce(undefined);

        const shareBtn = dom.window.document.getElementById('btn-share');
        shareBtn.click();

        await new Promise(process.nextTick);

        expect(writeTextMock).toHaveBeenCalledWith('http://example.com/#12345');
        expect(showDialogMock).toHaveBeenCalledWith({
            title: "Link Copied!",
            message: "The link for THIS specific database has been copied to your clipboard. Paste it into your phone's browser, bookmark it, and both devices will be perfectly synced to the exact same database forever.",
            confirmText: "Got it"
        });
    });

    test('should show error dialog when copy fails', async () => {
        // Ensure dbId is truthy
        dom.window.eval('dbId = "12345";');
        writeTextMock.mockRejectedValueOnce(new Error('Failed to copy'));

        const shareBtn = dom.window.document.getElementById('btn-share');
        shareBtn.click();

        // Wait for next tick so catch block runs
        await new Promise(process.nextTick);

        expect(writeTextMock).toHaveBeenCalledWith('http://example.com/#12345');
        expect(showDialogMock).toHaveBeenCalledWith({
            title: "Copy Failed",
            message: "Manually copy the URL at the top of your browser. Make sure it includes the # and the letters/numbers at the end."
        });
    });
});
