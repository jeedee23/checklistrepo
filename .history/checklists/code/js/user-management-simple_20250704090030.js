// Simple user management test
console.log('Simple user management loading...');

export function showUserManagementDialog() {
    console.log('showUserManagementDialog called');
    
    // Create a simple dialog
    let dialog = document.getElementById('test-dialog');
    if (!dialog) {
        dialog = document.createElement('div');
        dialog.id = 'test-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid black;
            padding: 20px;
            z-index: 1000;
            font-family: Consolas, monospace;
            font-size: 9pt;
        `;
        document.body.appendChild(dialog);
    }
    
    dialog.innerHTML = `
        <h3>Test User Management Dialog</h3>
        <p>This is a simple test dialog.</p>
        <button id="test-close">Close</button>
    `;
    
    dialog.style.display = 'block';
    console.log('Dialog created and should be visible');
    
    // Add close button handler
    document.getElementById('test-close').addEventListener('click', () => {
        console.log('Close button clicked');
        dialog.style.display = 'none';
    });
}

console.log('Simple user management module loaded');
