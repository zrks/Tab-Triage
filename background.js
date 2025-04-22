// For Chrome compatibility
// const browser = typeof browser === 'undefined' ? chrome : browser;

(async function initializeBackgroundScript() {

  // --- State Tracking ---
  const pendingTabChecks = new Set();

  // Get the settings page URL for comparison
  const optionsUrl = browser.runtime.getURL("options.html");

  let openingOptionsPage = false;

  // --- Utility Functions ---

  /**
   * Shows a notification or triggers a quiz challenge when tab limit is reached.
   * @param {number} tabId - The ID of the tab to notify about.
   */
  async function showLimitReachedNotification(tabId) {
    try {

      const activeTabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (activeTabs.length === 0) return;

      const activeTab = activeTabs[0];

      const api = typeof browser !== 'undefined' ? browser : chrome;

      if (api.notifications && api.notifications.create) {
        api.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Tab Limit Reached',
          message: `You've reached the maximum of ${maxTabsPerWindow} tabs in this window.`,
        });
      } else {
        console.warn('Notifications API is not available.');
      }

      console.log("browser.notifications =", browser.notifications);

      try {
        // Try content script approach for interactive challenge
        await browser.tabs.sendMessage(activeTab.id, {
          action: 'showLimitPopup',
          maxTabs: maxTabsPerWindow,
        });
      } catch (err) {
        console.warn('could not await browser.tabs.sendMessage(activeTab.id, {.');
        console.warn('Error sending message to content script:', err);
        // Fall back to basic notification if content script communication fails
        browser.notifications.create({
          type: 'basic',
          title: 'Tab Limit Reached',
          message: `You've reached the maximum of ${maxTabsPerWindow} tabs in this window.`,
        });
      }
    } catch (err) {
      console.error('Error showing tab limit notification:', err);
    }
  }

  // --- Initialization ---

  await browser.runtime.onInstalled.addListener(() => {
    console.log('Tab Triage Extension installed.');
  });

  let maxTabsPerWindow = await browser.storage.local
    .get('maxTabsPerWindow')
    .then((result) => {
      if (result.maxTabsPerWindow === undefined) {
        console.log('maxTabsPerWindow not found, setting to 10');
        return 10;
      }
      return result.maxTabsPerWindow;
    })
    .catch((err) => {
      console.error('Error retrieving maxTabsPerWindow from storage:', err);
      return 10;
    });

  // Listen for storage changes to update maxTabsPerWindow
  browser.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.maxTabsPerWindow) {
      console.log(
        `maxTabsPerWindow changed from ${maxTabsPerWindow} to ${changes.maxTabsPerWindow.newValue}`
      );
      maxTabsPerWindow = changes.maxTabsPerWindow.newValue;
    }
  });

  // --- Event Listeners ---

  /**
   * Handles new tab creation; removes tab if limit exceeded.
   */
  async function handleTabCreated(tab) {
    console.log('Tab created');

    if (tab.windowId === undefined) {
      return;
    }

    try {
      const tabsInWindow = await browser.tabs.query({ windowId: tab.windowId });

      if (tabsInWindow.length > maxTabsPerWindow) {
        console.log(`Maximum tabs (${maxTabsPerWindow}) reached, removing new tab.`);
        await browser.tabs.remove(tab.id);
        await showLimitReachedNotification(tab.id);
      } else {
        // Track tabs for URL validation on update
        pendingTabChecks.add(tab.id);
      }
    } catch (err) {
      console.error('Error handling tab creation:', err);
    }
  }

  /**
 * Check if a tab is loading the options page
 * @param {object} tab - Tab object to check
 * @returns {boolean} True if the tab is the options page
 */
  function isOptionsPage(tab) {
    const url = tab.url || tab.pendingUrl || "";
    return url.startsWith(optionsUrl);
  }

  /**
   * Handles tab updates; removes tab if limit exceeded after URL change.
   */
  function handleTabUpdated(tabId, changeInfo, tab) {
    // Only inject if the tab has a valid HTTP(S) URL
    if (tab.url && tab.url.startsWith("http")) {
      try {
        browser.tabs.executeScript(tabId, { file: "content.js" });
      } catch (err) {
        console.warn("Could not inject content script:", err.message);
      }
    }

    if (pendingTabChecks.has(tabId) && changeInfo.url) {
      pendingTabChecks.delete(tabId);

      if (!isOptionsPage(tab) && !openingOptionsPage) {
        browser.tabs
          .query({ windowId: tab.windowId })
          .then((tabs) => {
            if (tabs.length > maxTabsPerWindow) {
              browser.tabs.remove(tabId);
              showLimitReachedNotification(tabId);
              console.log(`Tab removed: ${tabId}`);
            }
          })
          .catch((error) => {
            console.error('Error checking updated tab:', error);
          });
      }
    }
  }

  browser.tabs.onCreated.addListener(handleTabCreated);
  browser.tabs.onUpdated.addListener(handleTabUpdated);

})();
