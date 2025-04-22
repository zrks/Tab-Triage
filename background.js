(async () => {
  // --- Constants & State ---
  const pendingTabChecks = new Set();
  const optionsUrl = browser.runtime.getURL("options.html");
  let openingOptionsPage = false;

  // Default value for maxTabsPerWindow
  let maxTabsPerWindow = await browser.storage.local
    .get("maxTabsPerWindow")
    .then((result) => {
      if (result.maxTabsPerWindow === undefined) {
        console.log("[Init] maxTabsPerWindow not found, setting to 10");
        return 10;
      }
      return result.maxTabsPerWindow;
    })
    .catch((err) => {
      console.error("[Init] Error retrieving maxTabsPerWindow from storage:", err);
      return 10;
    });

  // --- Utility Functions ---

  const showLimitReachedNotification = async (tabId) => {
    try {
      const activeTabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (activeTabs.length === 0) return;

      const activeTab = activeTabs[0];
      const api = typeof browser !== "undefined" ? browser : chrome;

      if (api.notifications && api.notifications.create) {
        api.notifications.create({
          type: "basic",
          iconUrl: "icons/icon128.png",
          title: "Tab Limit Reached",
          message: `You've reached the maximum of ${maxTabsPerWindow} tabs in this window.`,
        });
      } else {
        console.warn("[Notify] Notifications API is not available.");
      }

      console.log("[Notify] browser.notifications =", browser.notifications);

      try {
        await browser.tabs.sendMessage(activeTab.id, {
          action: "showLimitPopup",
          maxTabs: maxTabsPerWindow,
        });
      } catch (err) {
        console.warn("[Notify] Error sending message to content script:", err);
      }
    } catch (err) {
      console.error("[Notify] Error showing tab limit notification:", err);
    }
  };

  const isOptionsPage = (tab) => {
    const url = tab.url || tab.pendingUrl || "";
    return url.startsWith(optionsUrl);
  };

  // --- Event Handlers ---

  const handleTabCreated = async (tab) => {
    console.log("[Tab] Created");

    if (tab.windowId === undefined) return;

    try {
      const tabsInWindow = await browser.tabs.query({ windowId: tab.windowId });

      if (tabsInWindow.length > maxTabsPerWindow) {
        console.log(`[Tab] Limit reached (${maxTabsPerWindow}), removing tab.`);
        await browser.tabs.remove(tab.id);
        await showLimitReachedNotification(tab.id);
      } else {
        pendingTabChecks.add(tab.id);
      }
    } catch (err) {
      console.error("[Tab] Error handling tab creation:", err);
    }
  };

  const handleTabUpdated = (tabId, changeInfo, tab) => {
    if (tab.url && tab.url.startsWith("http")) {
      try {
        browser.tabs.executeScript(tabId, { file: "content.js" });
      } catch (err) {
        console.warn("[Update] Could not inject content script:", err.message);
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
              console.log(`[Update] Tab removed: ${tabId}`);
            }
          })
          .catch((err) => {
            console.error("[Update] Error checking updated tab:", err);
          });
      }
    }
  };

  // --- Event Listeners ---

  browser.tabs.onCreated.addListener(handleTabCreated);
  browser.tabs.onUpdated.addListener(handleTabUpdated);

  browser.runtime.onInstalled.addListener(() => {
    console.log("[Init] Tab Triage Extension installed.");
  });

  browser.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.maxTabsPerWindow) {
      console.log(`[Storage] maxTabsPerWindow changed from ${maxTabsPerWindow} to ${changes.maxTabsPerWindow.newValue}`);
      maxTabsPerWindow = changes.maxTabsPerWindow.newValue;
    }
  });
})();
