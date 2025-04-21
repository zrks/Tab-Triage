function createTabCard(tab) {
  const div = document.createElement('div');
  div.className = 'tab-card';
  div.innerHTML = `
      <div class="title">${tab.title}</div>
      <div class="url">${tab.url}</div>
      <button data-action="read" data-id="${tab.id}">👁 Read Now</button>
      <button data-action="save" data-id="${tab.id}">📥 Save</button>
      <button data-action="close" data-id="${tab.id}">❌ Close</button>
    `;
  return div;
}

function loadTabs() {
  chrome.tabs.query({}, (tabs) => {
    const tabList = document.getElementById('tab-list');
    tabList.innerHTML = '';
    tabs.forEach(tab => {
      const card = createTabCard(tab);
      tabList.appendChild(card);
    });
  });
}

document.addEventListener('click', (e) => {
  const btn = e.target;
  if (btn.tagName === 'BUTTON') {
    const action = btn.dataset.action;
    const tabId = parseInt(btn.dataset.id);
    if (action === 'close') chrome.tabs.remove(tabId);
    if (action === 'read') {
      chrome.tabs.update(tabId, { active: true }, () => {
        chrome.tabs.get(tabId, (tab) => {
          chrome.windows.update(tab.windowId, { focused: true });
        });
      });
    }
    if (action === 'save') {
      chrome.storage.local.get({ savedTabs: [] }, (data) => {
        const updated = [...data.savedTabs, tabId];
        chrome.storage.local.set({ savedTabs: updated });
        const popup = document.createElement('div');
        popup.textContent = 'Tab saved!';
        popup.style.position = 'fixed';
        popup.style.bottom = '20px';
        popup.style.right = '20px';
        popup.style.padding = '10px 15px';
        popup.style.backgroundColor = '#323232';
        popup.style.color = 'white';
        popup.style.borderRadius = '4px';
        popup.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        popup.style.opacity = '1';
        popup.style.transition = 'opacity 0.5s ease';

        document.body.appendChild(popup);

        setTimeout(() => {
          popup.style.opacity = '0';
          setTimeout(() => popup.remove(), 500);
        }, 1000);
      });
    }
  }
});

loadTabs();
