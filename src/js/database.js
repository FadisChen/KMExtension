// 資料庫操作類
class KMDatabase {
  constructor() {
    this.dbName = 'KMExtensionDB';
    this.dbVersion = 1;
    this.db = null;
  }

  // 開啟資料庫連接
  async openDatabase() {
    if (this.db) return this.db;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = (event) => {
        console.error('無法開啟資料庫:', event);
        reject('資料庫開啟失敗');
      };
      
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 建立知識卡片存儲區
        if (!db.objectStoreNames.contains('knowledgeCards')) {
          const store = db.createObjectStore('knowledgeCards', { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('pageTitle', 'pageTitle', { unique: false });
        }
      };
    });
  }

  // 儲存知識卡片
  async saveCard(cardData) {
    const db = await this.openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['knowledgeCards'], 'readwrite');
      const store = transaction.objectStore('knowledgeCards');
      
      // 確保有時間戳記
      if (!cardData.timestamp) {
        cardData.timestamp = new Date().toISOString();
      }
      
      const request = store.add(cardData);
      
      request.onsuccess = (event) => {
        resolve(event.target.result); // 返回新增記錄的 ID
      };
      
      request.onerror = (event) => {
        console.error('儲存卡片失敗:', event);
        reject('無法儲存知識卡片');
      };
    });
  }

  // 取得所有知識卡片
  async getAllCards() {
    const db = await this.openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['knowledgeCards'], 'readonly');
      const store = transaction.objectStore('knowledgeCards');
      const index = store.index('timestamp');
      
      // 使用時間戳記索引，逆序排列（最新的先顯示）
      const request = index.openCursor(null, 'prev');
      const cards = [];
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cards.push(cursor.value);
          cursor.continue();
        } else {
          resolve(cards);
        }
      };
      
      request.onerror = (event) => {
        console.error('取得卡片失敗:', event);
        reject('無法取得知識卡片');
      };
    });
  }

  // 刪除知識卡片
  async deleteCard(id) {
    const db = await this.openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['knowledgeCards'], 'readwrite');
      const store = transaction.objectStore('knowledgeCards');
      
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error('刪除卡片失敗:', event);
        reject('無法刪除知識卡片');
      };
    });
  }
}

// 匯出資料庫實例
const kmDatabase = new KMDatabase(); 