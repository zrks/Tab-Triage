// Load saved options
document.addEventListener('DOMContentLoaded', () => {
    const loadSettings = () => {
    chrome.storage.local.get(['closeDuplicateTabs', 'highlightUnreadTabs', 'maxTabsPerWindow'], (result) => {
      if (typeof result.closeDuplicateTabs !== 'undefined') {
        document.getElementById('closeDuplicateTabs').checked = result.closeDuplicateTabs;
      }
      if (typeof result.highlightUnreadTabs !== 'undefined') {
        document.getElementById('highlightUnreadTabs').checked = result.highlightUnreadTabs;
      }
        if (typeof result.maxTabsPerWindow !== 'undefined') {
            document.getElementById('maxTabsPerWindow').value = result.maxTabsPerWindow;
          }else{
            document.getElementById('maxTabsPerWindow').value = 10;
          }
    });
    };
    loadSettings()
  });
  // Save options
  document.getElementById('save').addEventListener('click', () => {
    const closeDuplicateTabs = document.getElementById('closeDuplicateTabs').checked;
    const highlightUnreadTabs = document.getElementById('highlightUnreadTabs').checked;
  
    chrome.storage.local.set({
      "closeDuplicateTabs": closeDuplicateTabs,
      "highlightUnreadTabs": highlightUnreadTabs,
      "maxTabsPerWindow": Number(document.getElementById('maxTabsPerWindow').value)

    }, () => {
      const status = document.getElementById('status');
      status.textContent = 'Settings saved!';
      setTimeout(() => status.textContent = '', 1500);
    });
  });
