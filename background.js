// For Chrome compatibility
const browser = typeof browser === 'undefined' ? chrome : browser;

(function () {
  browser.runtime.onInstalled.addListener(() => {
    console.log('Tab Triage Extension installed.');
  });
})();
