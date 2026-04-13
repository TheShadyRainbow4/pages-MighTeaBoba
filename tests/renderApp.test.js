const fs = require('fs');
const path = require('path');

describe('renderApp', () => {

    beforeEach(() => {
        const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
        document.body.innerHTML = html;

        // Find the main script tag
        const scriptTags = Array.from(document.querySelectorAll('script'));
        const appScript = scriptTags.find(script => script.textContent.includes('function renderApp()'));

        if (appScript) {
            let codeToRun = appScript.textContent;

            // Remove 'let inventory = [];' so we can define it ourselves
            codeToRun = codeToRun.replace('let inventory = [];', '');

            // Re-evaluate in the JS DOM window, wrap in IIFE to prevent const re-declaration issues
            window.eval(`
                (function() {
                    window.addEventListener = function() {}; // avoid load events
                    window.setInterval = function() {}; // avoid polling

                    var inventory = [];
                    ${codeToRun}

                    window.setInventory = function(arr) { inventory = arr; };
                    window.testRenderApp = renderApp;
                })();
            `);
        }
    });

    test('renders grouped and sorted inventory items', () => {
        // Setup state
        window.setInventory([
            { id: 1, name: 'Boba', category: 'Toppings', quantity: 10, unit: 'bags' },
            { id: 2, name: 'Milk', category: 'Dairy', quantity: 5, unit: 'gallons' },
            { id: 3, name: 'Jelly', category: 'Toppings', quantity: 2, unit: 'jars' },
            { id: 4, name: 'Green Tea', category: 'Tea', quantity: 8, unit: 'lbs' },
            { id: 5, name: 'Apple', category: '', quantity: 1, unit: 'pc' },
        ]);

        // Execute function
        window.testRenderApp();

        // Check DOM state
        const container = document.getElementById('inventory-container');
        expect(container).not.toBeNull();

        // Assertions on categories and sorting
        const sections = container.querySelectorAll('section');
        expect(sections.length).toBe(4); // Dairy, Tea, Toppings, Uncategorized

        // Verify Uncategorized category is handled
        const firstCategoryHeading = sections[0].querySelector('h2').textContent;
        expect(firstCategoryHeading).toBe('Dairy'); // Alphabetical order: Dairy, Tea, Toppings, Uncategorized

        const lastCategoryHeading = sections[3].querySelector('h2').textContent;
        expect(lastCategoryHeading).toBe('Uncategorized');

        // Check if items are sorted within category 'Toppings'
        const toppingsSection = Array.from(sections).find(sec => sec.querySelector('h2').textContent === 'Toppings');
        const itemNames = Array.from(toppingsSection.querySelectorAll('.font-semibold.text-sm.truncate')).map(el => el.textContent);

        expect(itemNames).toEqual(['Boba', 'Jelly']); // Boba comes before Jelly

        // Check if item details are correctly rendered
        const bobaDiv = Array.from(toppingsSection.querySelectorAll('.group')).find(el => el.querySelector('.font-semibold').textContent === 'Boba');
        const quantityText = bobaDiv.querySelector('.text-base.font-bold').textContent;
        expect(quantityText).toBe('10');

        const unitText = bobaDiv.querySelector('.text-\\[10px\\]').textContent;
        expect(unitText).toBe('bags');
    });

    test('renders empty state correctly when inventory is empty', () => {
        window.setInventory([]);
        window.testRenderApp();

        const container = document.getElementById('inventory-container');
        expect(container.innerHTML).toBe('');
    });

    test('renders item without a unit correctly', () => {
        window.setInventory([
            { id: 1, name: 'Straws', category: 'Supplies', quantity: 100 }
        ]);
        window.testRenderApp();

        const container = document.getElementById('inventory-container');
        const itemDiv = container.querySelector('.group');

        // Should not have a unit div
        const unitDiv = itemDiv.querySelector('.text-\\[10px\\]');
        expect(unitDiv).toBeNull();
    });

    test('populates datalist with categories', () => {
        window.setInventory([
            { id: 1, name: 'Boba', category: 'Toppings', quantity: 10, unit: 'bags' },
            { id: 2, name: 'Milk', category: 'Dairy', quantity: 5, unit: 'gallons' },
        ]);
        window.testRenderApp();

        const datalist = document.getElementById('category-list');
        const options = Array.from(datalist.querySelectorAll('option')).map(opt => opt.value);

        expect(options).toEqual(['Dairy', 'Toppings']);
    });
});
