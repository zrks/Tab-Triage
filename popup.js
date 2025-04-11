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
      if (action === 'read') chrome.tabs.update(tabId, { active: true });
      if (action === 'save') {
        chrome.storage.local.get({ savedTabs: [] }, (data) => {
          const updated = [...data.savedTabs, tabId];
          chrome.storage.local.set({ savedTabs: updated });
          alert('Tab saved!');
        });
      }
    }
  });
  
  loadTabs();
