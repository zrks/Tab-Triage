// // For Chrome compatibility
// const browser = typeof browser === 'undefined' ? chrome : browser;


(async function () {

  // State tracking
  const pendingTabChecks = new Set();

  async function showLimitReachedNotification(tabId) {
    try {
      const activeTabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (activeTabs.length === 0) return;

      const activeTab = activeTabs[0];

      try {
        // First try to use the content script approach for the reaction game
        await browser.tabs.sendMessage(activeTab.id, {
          action: 'triggerQuizChallenge',
          maxTabs: maxTabsPerWindow
        });
      } catch (err) {
        // Fall back to basic notification if content script communication fails
        browser.notifications.create({
          type: "basic",
          title: "Tab Limit Reached",
          message: `You've reached the maximum of ${maxTabsPerWindow} tabs in this window.`
        });
      }
    } catch (err) {
      console.error("Error showing tab limit notification:", err);
    }
  }

  await browser.runtime.onInstalled.addListener(() => {
    console.log('Tab Triage Extension installed.');
  });

  let maxTabsPerWindow = await browser.storage.local.get('maxTabsPerWindow').then((result) => {
    if (result.maxTabsPerWindow === undefined) {
      console.log("maxTabsPerWindow not found, setting to 10");
      return 10;
    } else {
      return result.maxTabsPerWindow;
    }
  });

  // Listen for storage changes to update the maxTabsPerWindow value
  browser.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.maxTabsPerWindow) {
      console.log(`maxTabsPerWindow changed from ${maxTabsPerWindow} to ${changes.maxTabsPerWindow.newValue}`);
      maxTabsPerWindow = changes.maxTabsPerWindow.newValue;
    }
  });

  browser.tabs.onCreated.addListener(async (tab) => {
    console.log("Tab created");

    if (tab.windowId === undefined) {
      return;
    }

    const tabsInWindow = await browser.tabs.query({ windowId: tab.windowId });

    if (tabsInWindow.length > maxTabsPerWindow) {
      console.log(`Maximum tabs (${maxTabsPerWindow}) reached, removing new tab.`);
      browser.tabs.remove(tab.id);
      showLimitReachedNotification(tab.id);
    } else {
      // Track tabs for URL validation in onUpdated
      pendingTabChecks.add(tab.id);
    }
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (pendingTabChecks.has(tabId) && changeInfo.url) {
      pendingTabChecks.delete(tabId);

      if (!isOptionsPage(tab) && !openingOptionsPage) {
        browser.tabs.query({ windowId: tab.windowId }).then(tabs => {
          if (tabs.length > maxTabsPerWindow) {
            browser.tabs.remove(tabId);
            showLimitReachedNotification(tabId);
          }
        }).catch(error => {
          console.error("Error checking updated tab:", error);
        });
      }
    }
  });

})();
