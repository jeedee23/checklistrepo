/**
 * Initialize the menu system.
 * Should be called after DOM is loaded.
 */
export async function initMenuSystem() {
  // Load list types configuration
  await loadListTypes();
  
  // Attach event listeners to all menu items
  attachMenuHandlers();
  
  // Initial update of Tools menu based on current checklist type
  updateToolsMenu();
  
  // Set up menu item enable/disable logic based on state
  setupMenuStateObserver();
  
  // Set up right-click on header for column visibility
  initHeaderRightClick();
}
