// Load saved options
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['closeDuplicateTabs', 'highlightUnreadTabs'], (result) => {
      if (typeof result.closeDuplicateTabs !== 'undefined') {
        document.getElementById('closeDuplicateTabs').checked = result.closeDuplicateTabs;
      }
      if (typeof result.highlightUnreadTabs !== 'undefined') {
        document.getElementById('highlightUnreadTabs').checked = result.highlightUnreadTabs;
      }
    });
  });
  
  // Save options
  document.getElementById('save').addEventListener('click', () => {
    const closeDuplicateTabs = document.getElementById('closeDuplicateTabs').checked;
    const highlightUnreadTabs = document.getElementById('highlightUnreadTabs').checked;
  
    chrome.storage.local.set({
      "closeDuplicateTabs": closeDuplicateTabs,
      "highlightUnreadTabs": highlightUnreadTabs
    }, () => {
      const status = document.getElementById('status');
      status.textContent = 'Settings saved!';
      setTimeout(() => status.textContent = '', 1500);
    });
  });
