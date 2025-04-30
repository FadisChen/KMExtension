// DOM 元素
const captureBtn = document.getElementById('captureBtn');
const cancelCaptureBtn = document.getElementById('cancelCaptureBtn');
const exportBtn = document.getElementById('exportBtn');
const cardsContainer = document.getElementById('cardsContainer');
const emptyState = document.getElementById('emptyState');
const speechRateInput = document.getElementById('speechRate');
const speechRateValue = document.getElementById('speechRateValue');

// 匯出模態框元素
const exportModal = document.getElementById('exportModal');
const closeExportModal = document.getElementById('closeExportModal');
const exportCardsList = document.getElementById('exportCardsList');
const selectAllCards = document.getElementById('selectAllCards');
const confirmExportBtn = document.getElementById('confirmExportBtn');
const cancelExportBtn = document.getElementById('cancelExportBtn');

// 刪除確認模態框元素
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const closeDeleteModal = document.getElementById('closeDeleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// 當前活動的刪除卡片 ID
let currentDeleteCardId = null;

// 當前是否處於擷取模式
let isCapturing = false;

// 初始化頁面
document.addEventListener('DOMContentLoaded', () => {
  loadCards();
  setupEventListeners();
  updateSpeechRate(); // 初始化語音速度顯示
});

// 設置事件監聽器
function setupEventListeners() {
  // 擷取按鈕
  captureBtn.addEventListener('click', startCapture);
  cancelCaptureBtn.addEventListener('click', stopCapture);
  
  // 匯出按鈕
  exportBtn.addEventListener('click', showExportModal);
  closeExportModal.addEventListener('click', hideExportModal);
  cancelExportBtn.addEventListener('click', hideExportModal);
  confirmExportBtn.addEventListener('click', exportSelectedCards);
  
  // 語音速度滑桿
  speechRateInput.addEventListener('input', updateSpeechRate);
  
  // 全選切換
  selectAllCards.addEventListener('change', toggleSelectAllCards);
  
  // 刪除確認
  closeDeleteModal.addEventListener('click', hideDeleteModal);
  cancelDeleteBtn.addEventListener('click', hideDeleteModal);
  confirmDeleteBtn.addEventListener('click', confirmDelete);
  
  // 監聽來自內容腳本的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'capturedContent') {
      saveCard(message.data);
      // 確保擷取按鈕狀態重置
      stopCapture();
    }
    sendResponse({ status: 'received' });
    return true;
  });
}

// 載入所有知識卡片
async function loadCards() {
  try {
    const cards = await kmDatabase.getAllCards();
    
    // 清空容器先
    cardsContainer.innerHTML = '';
    
    // 更新空白狀態顯示
    if (cards.length === 0) {
      // 確保顯示空白狀態
      if (!cardsContainer.contains(emptyState)) {
        cardsContainer.appendChild(emptyState);
      }
      emptyState.style.display = 'flex';
    } else {
      emptyState.style.display = 'none';
      if (cardsContainer.contains(emptyState)) {
        cardsContainer.removeChild(emptyState);
      }
      
      // 添加卡片
      cards.forEach(card => {
        cardsContainer.appendChild(createCardElement(card));
      });
    }
  } catch (error) {
    console.error('載入卡片失敗:', error);
    showNotification('載入知識卡片失敗', 'error');
  }
}

// 建立知識卡片元素
function createCardElement(card) {
  const cardElement = document.createElement('div');
  cardElement.className = 'knowledge-card';
  cardElement.dataset.id = card.id;
  
  // 格式化時間戳記
  const timestamp = new Date(card.timestamp);
  const formattedDate = `${timestamp.getFullYear()}/${(timestamp.getMonth() + 1).toString().padStart(2, '0')}/${timestamp.getDate().toString().padStart(2, '0')} ${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}`;
  
  cardElement.innerHTML = `
    <div class="card-header">
      <div>
        <div class="card-title">${card.pageTitle}</div>
        <div class="card-timestamp">${formattedDate}</div>
      </div>
      <div class="card-actions">
        <div class="speak-icon" data-id="${card.id}" title="朗讀">🔊</div>
        <div class="delete-icon" data-id="${card.id}" title="刪除">❌</div>
      </div>
    </div>
    <div class="card-content">${card.content}</div>
    ${card.url ? `<a href="${card.url}" class="card-url" target="_blank">${card.url}</a>` : ''}
  `;
    // 添加刪除事件
  const deleteIcon = cardElement.querySelector('.delete-icon');
  deleteIcon.addEventListener('click', () => {
    showDeleteConfirmation(card.id);
  });
  
  // 添加朗讀事件
  const speakIcon = cardElement.querySelector('.speak-icon');
  speakIcon.addEventListener('click', () => {
    speakCardContent(card.content);
  });
  
  return cardElement;
}

// 開始擷取
function startCapture() {
  isCapturing = true;
  captureBtn.style.display = 'none';
  cancelCaptureBtn.style.display = 'inline-block';
  
  // 獲取當前活動的標籤頁
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      // 發送消息到內容腳本
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startCapture' }, (response) => {
        if (chrome.runtime.lastError) {
          // 如果內容腳本尚未載入，則注入內容腳本
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['../js/content-script.js']
          }, () => {
            // 注入後再次嘗試發送消息
            setTimeout(() => {
              chrome.tabs.sendMessage(tabs[0].id, { action: 'startCapture' });
            }, 100);
          });
        }
      });
    }
  });
}

// 停止擷取
function stopCapture() {
  isCapturing = false;
  captureBtn.style.display = 'inline-block';
  cancelCaptureBtn.style.display = 'none';
  
  // 獲取當前活動的標籤頁
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      // 發送消息到內容腳本
      chrome.tabs.sendMessage(tabs[0].id, { action: 'stopCapture' });
    }
  });
}

// 儲存知識卡片
async function saveCard(cardData) {
  try {
    await kmDatabase.saveCard(cardData);
    showNotification('知識已成功儲存', 'success');
    loadCards(); // 重新載入卡片
  } catch (error) {
    console.error('儲存卡片失敗:', error);
    showNotification('儲存知識卡片失敗', 'error');
  }
}

// 顯示匯出模態框
function showExportModal() {
  exportCardsList.innerHTML = '';
  
  // 載入所有卡片到匯出列表
  kmDatabase.getAllCards().then(cards => {
    if (cards.length === 0) {
      exportCardsList.innerHTML = '<p>沒有可匯出的知識卡片</p>';
      confirmExportBtn.disabled = true;
    } else {
      confirmExportBtn.disabled = false;
      
      cards.forEach(card => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'export-card-option';
        
        // 格式化時間戳記
        const timestamp = new Date(card.timestamp);
        const formattedDate = `${timestamp.getFullYear()}/${(timestamp.getMonth() + 1).toString().padStart(2, '0')}/${timestamp.getDate().toString().padStart(2, '0')}`;
        
        optionDiv.innerHTML = `
          <input type="checkbox" id="card-${card.id}" class="card-checkbox" data-id="${card.id}">
          <label for="card-${card.id}">
            <strong>${card.pageTitle}</strong> (${formattedDate})
          </label>
        `;
        
        exportCardsList.appendChild(optionDiv);
      });
    }
    
    exportModal.style.display = 'flex';
  });
}

// 隱藏匯出模態框
function hideExportModal() {
  exportModal.style.display = 'none';
  selectAllCards.checked = false;
}

// 切換全選
function toggleSelectAllCards() {
  const checkboxes = document.querySelectorAll('.card-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAllCards.checked;
  });
}

// 匯出選中的卡片
function exportSelectedCards() {
  const selectedCheckboxes = document.querySelectorAll('.card-checkbox:checked');
  
  if (selectedCheckboxes.length === 0) {
    showNotification('請選擇至少一個知識卡片', 'warning');
    return;
  }
  
  // 獲取選中的卡片 ID
  const selectedIds = Array.from(selectedCheckboxes).map(checkbox => 
    parseInt(checkbox.dataset.id)
  );
  
  // 獲取卡片數據
  kmDatabase.getAllCards().then(cards => {
    // 過濾選中的卡片
    const selectedCards = cards.filter(card => selectedIds.includes(card.id));
    
    if (selectedCards.length === 0) return;
    
    // 組織匯出內容
    let exportContent = '';
    
    selectedCards.forEach(card => {
      const timestamp = new Date(card.timestamp);
      const formattedDate = `${timestamp.getFullYear()}/${(timestamp.getMonth() + 1).toString().padStart(2, '0')}/${timestamp.getDate().toString().padStart(2, '0')} ${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}`;
      
      exportContent += `標題: ${card.pageTitle}\n`;
      exportContent += `時間: ${formattedDate}\n`;
      exportContent += `網址: ${card.url || '無'}\n`;
      exportContent += `內容:\n${card.content}\n\n`;
      exportContent += '---------------------------------------------------\n\n';
    });
    
    // 建立並下載檔案
    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    // 建立檔名：KM_Export_YYYYMMDD.txt
    const now = new Date();
    const fileName = `KM_Export_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.txt`;
    
    a.href = url;
    a.download = fileName;
    a.click();
    
    URL.revokeObjectURL(url);
    hideExportModal();
    showNotification('知識卡片已成功匯出', 'success');
  });
}

// 顯示刪除確認
function showDeleteConfirmation(cardId) {
  currentDeleteCardId = cardId;
  deleteConfirmModal.style.display = 'flex';
}

// 隱藏刪除確認
function hideDeleteModal() {
  deleteConfirmModal.style.display = 'none';
  currentDeleteCardId = null;
}

// 確認刪除
async function confirmDelete() {
  if (currentDeleteCardId === null) return;
  
  try {
    await kmDatabase.deleteCard(currentDeleteCardId);
    hideDeleteModal();
    showNotification('知識卡片已刪除', 'success');
    loadCards(); // 重新載入卡片
  } catch (error) {
    console.error('刪除卡片失敗:', error);
    showNotification('刪除知識卡片失敗', 'error');
  }
}

// 顯示通知消息
function showNotification(message, type = 'info') {
  // 簡易通知實現
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // 3秒後自動移除
  setTimeout(() => {
    notification.classList.add('hide');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// 朗讀卡片內容
function speakCardContent(content) {
  // 檢查瀏覽器是否支援語音合成 API
  if ('speechSynthesis' in window) {
    // 找到點擊的喇叭圖示
    const speakIcon = event.currentTarget;
    const cardElement = speakIcon.closest('.knowledge-card');
      // 如果當前正在朗讀，則停止朗讀
    if (speakIcon.classList.contains('speaking')) {
      // 手動停止朗讀不應視為錯誤，僅需取消朗讀
      window.speechSynthesis.cancel();
      speakIcon.textContent = '🔊';
      speakIcon.classList.remove('speaking');
      cardElement.classList.remove('card-speaking');
      showNotification('已停止朗讀', 'info');
      return;
    }
    
    // 停止任何進行中的朗讀
    window.speechSynthesis.cancel();
    
    // 重置所有喇叭圖示
    document.querySelectorAll('.speak-icon').forEach(icon => {
      icon.textContent = '🔊';
      icon.classList.remove('speaking');
    });
    
    // 重置所有卡片樣式
    document.querySelectorAll('.knowledge-card').forEach(card => {
      card.classList.remove('card-speaking');
    });
      // 建立新的語音合成訊息
    const speech = new SpeechSynthesisUtterance(content);
    
    // 設定語言為中文
    speech.lang = 'zh-TW';
      // 設定語音速度
    speech.rate = parseFloat(speechRateInput.value);
    
    // 當朗讀開始時
    speech.onstart = () => {
      // 更改喇叭圖示的樣式，表示正在朗讀
      speakIcon.textContent = '⏸️';
      speakIcon.classList.add('speaking');
      cardElement.classList.add('card-speaking');
      showNotification('開始朗讀內容', 'info');
    };
    
    // 當朗讀結束時
    speech.onend = () => {
      // 恢復喇叭圖示
      speakIcon.textContent = '🔊';
      speakIcon.classList.remove('speaking');
      cardElement.classList.remove('card-speaking');
      showNotification('朗讀已完成', 'success');
    };
      // 朗讀發生錯誤時
    speech.onerror = (event) => {
      // 恢復喇叭圖示
      speakIcon.textContent = '🔊';
      speakIcon.classList.remove('speaking');
      cardElement.classList.remove('card-speaking');
    };
    
    // 開始朗讀
    window.speechSynthesis.speak(speech);  } else {
    // 瀏覽器不支援語音合成
    showNotification('您的瀏覽器不支援文字轉語音功能', 'error');
  }
}

// 更新語音速度顯示
function updateSpeechRate() {
  const value = parseFloat(speechRateInput.value);
  speechRateValue.textContent = value.toFixed(2);
  
  // 如果正在朗讀，更新當前朗讀的速度
  if (window.speechSynthesis.speaking) {
    // 停止當前朗讀
    const isSpeaking = window.speechSynthesis.speaking;
    if (isSpeaking) {
      // 暫存正在讀的內容
      const speakingElement = document.querySelector('.speak-icon.speaking');
      if (speakingElement) {
        // 獲取卡片 ID
        const cardId = speakingElement.dataset.id;
        // 暫停朗讀
        window.speechSynthesis.cancel();
        // 清除朗讀狀態
        document.querySelectorAll('.speak-icon').forEach(icon => {
          icon.textContent = '🔊';
          icon.classList.remove('speaking');
        });
        document.querySelectorAll('.knowledge-card').forEach(card => {
          card.classList.remove('card-speaking');
        });
        showNotification(`已更新語音速度為 ${value.toFixed(2)} 倍速`, 'info');
      }
    }
  }
}