/**
 * Script to fix the corrupted layout structure in the checklist JSON
 * 
 * The problem: Nested layouts arrays within layouts arrays
 * The solution: Clean up the structure and create a proper layout system
 */

// Read the current file
const fs = require('fs');
const path = require('path');

const filePath = './2025_06_20_@_15-11-58 Cosucra1.json';

try {
    console.log('Reading corrupted checklist file...');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);
    
    console.log('Current structure:');
    console.log('- Root layouts array length:', data.layouts?.length || 0);
    
    // Analyze the corruption
    data.layouts?.forEach((layout, index) => {
        console.log(`- Layout ${index} (${layout.layoutName}):`, {
            hasColumns: !!layout.columns,
            hasColumnOrder: !!layout.columnOrder,
            hasNestedLayouts: !!layout.layouts,
            nestedLayoutsCount: layout.layouts?.length || 0
        });
        
        if (layout.layouts) {
            layout.layouts.forEach((nested, nestedIndex) => {
                console.log(`  - Nested layout ${nestedIndex} (${nested.layoutName}):`, {
                    hasColumns: !!nested.columns,
                    hasColumnOrder: !!nested.columnOrder,
                    hasNestedLayouts: !!nested.layouts
                });
            });
        }
    });
    
    // Create a clean structure
    console.log('\nCleaning up layout structure...');
    
    const cleanedData = {
        ...data,
        layouts: [],
        layout: {
            columns: {},
            columnOrder: [],
            rowHeight: 30
        }
    };
    
    // Extract the good layouts from the mess
    const extractedLayouts = [];
    
    function extractLayoutsRecursively(layoutsArray, level = 0) {
        if (!Array.isArray(layoutsArray)) return;
        
        layoutsArray.forEach(layout => {
            if (layout.columns && layout.layoutName) {
                const cleanLayout = {
                    layoutName: layout.layoutName,
                    columns: layout.columns,
                    columnOrder: layout.columnOrder || Object.keys(layout.columns),
                    rows: layout.rows || { height: 30 }
                };
                
                // Avoid duplicates
                if (!extractedLayouts.find(l => l.layoutName === cleanLayout.layoutName)) {
                    extractedLayouts.push(cleanLayout);
                    console.log(`  Extracted layout: ${cleanLayout.layoutName} (level ${level})`);
                }
            }
            
            // Recursively extract from nested layouts
            if (layout.layouts) {
                extractLayoutsRecursively(layout.layouts, level + 1);
            }
        });
    }
    
    extractLayoutsRecursively(data.layouts);
    
    console.log(`\nExtracted ${extractedLayouts.length} clean layouts:`);
    extractedLayouts.forEach(layout => {
        console.log(`- ${layout.layoutName}: ${Object.keys(layout.columns).length} columns, order: ${layout.columnOrder?.length || 0}`);
    });
    
    // Set the clean layouts
    cleanedData.layouts = extractedLayouts;
    
    // Set the active layout to the first one (or "lastused" if it exists)
    const lastUsedLayout = extractedLayouts.find(l => l.layoutName === 'lastused');
    const activeLayout = lastUsedLayout || extractedLayouts[0];
    
    if (activeLayout) {
        cleanedData.layout = {
            columns: activeLayout.columns,
            columnOrder: activeLayout.columnOrder,
            rowHeight: activeLayout.rows?.height || 30
        };
        console.log(`\nSet active layout to: ${activeLayout.layoutName}`);
    }
    
    // Create backup
    const backupPath = filePath + '.backup-' + new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(backupPath, rawData);
    console.log(`\nBackup created: ${backupPath}`);
    
    // Write the cleaned data
    fs.writeFileSync(filePath, JSON.stringify(cleanedData, null, 2));
    console.log(`\nCleaned file written to: ${filePath}`);
    
    console.log('\n✅ Layout structure has been fixed!');
    console.log('The file now has:');
    console.log(`- ${cleanedData.layouts.length} clean layouts`);
    console.log(`- 1 active layout with ${Object.keys(cleanedData.layout.columns).length} columns`);
    console.log(`- Column order: ${cleanedData.layout.columnOrder?.join(', ')}`);
    
} catch (error) {
    console.error('Error fixing layout structure:', error);
}
