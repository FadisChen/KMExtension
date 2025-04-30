// 當擴展程式安裝或更新時執行
chrome.runtime.onInstalled.addListener(() => {
  console.log('KM Extension 已安裝');
});

// 當點擊擴展圖標時，開啟側邊欄
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// 初始化資料庫
function initDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('KMExtensionDB', 1);
    
    request.onerror = (event) => {
      console.error('資料庫錯誤:', event);
      reject('無法開啟資料庫');
    };
    
    request.onsuccess = (event) => {
      console.log('資料庫開啟成功');
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 建立知識卡片存儲區
      if (!db.objectStoreNames.contains('knowledgeCards')) {
        const store = db.createObjectStore('knowledgeCards', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('pageTitle', 'pageTitle', { unique: false });
        console.log('知識卡片存儲區已建立');
      }
    };
  });
}

// 當擴展程式啟動時初始化資料庫
initDatabase().catch(console.error); 