// For Chrome compatibility
const browser = typeof browser === 'undefined' ? chrome : browser;

(async function () {
  await browser.runtime.onInstalled.addListener(() => {
    console.log('Tab Triage Extension installed.');
  });

  let maxTabsPerWindow = await browser.storage.local.get('maxTabsPerWindow').then((result) => {
    if (result.maxTabsPerWindow === undefined) {
      console.log("maxTabsPerWindow not found, setting to 10")
      return 10
    } else {
      return result.maxTabsPerWindow;
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
    }
  });



})();
