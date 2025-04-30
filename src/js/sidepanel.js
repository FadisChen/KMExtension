// DOM 元素
const captureBtn = document.getElementById('captureBtn');
const cancelCaptureBtn = document.getElementById('cancelCaptureBtn');
const exportBtn = document.getElementById('exportBtn');
const cardsContainer = document.getElementById('cardsContainer');
const emptyState = document.getElementById('emptyState');
const speechRateInput = document.getElementById('speechRate');
const speechRateValue = document.getElementById('speechRateValue');
const settingsIcon = document.getElementById('settingsIcon');

// 設定視窗元素
const settingsModal = document.getElementById('settingsModal');
const closeSettingsModal = document.getElementById('closeSettingsModal');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const geminiApiKeyInput = document.getElementById('geminiApiKey');
const geminiModelInput = document.getElementById('geminiModel');

// 卡片功能選單元素
const cardMenu = document.getElementById('cardMenu');
const speakMenuItem = document.getElementById('speakMenuItem');
const summarizeMenuItem = document.getElementById('summarizeMenuItem');
const deleteMenuItem = document.getElementById('deleteMenuItem');
const chatMenuItem = document.getElementById('chatMenuItem');

// 摘要視窗元素
const summaryModal = document.getElementById('summaryModal');
const closeSummaryModal = document.getElementById('closeSummaryModal');
const closeSummaryBtn = document.getElementById('closeSummaryBtn');
const summaryContent = document.getElementById('summaryContent');

// 對話視窗元素
const chatModal = document.getElementById('chatModal');
const closeChatModal = document.getElementById('closeChatModal');
const chatContent = document.getElementById('chatContent');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');

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

// 當前活動的卡片（用於選單和摘要）
let currentActiveCard = null;

// 當前是否處於擷取模式
let isCapturing = false;

// 全域變數儲存當前對話的卡片內容和對話歷史
let currentChatCard = null;
let chatHistory = [];

// 初始化頁面
document.addEventListener('DOMContentLoaded', () => {
  loadCards();
  setupEventListeners();
  loadSettings();
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
    // 設定按鈕和相關功能
  if (settingsIcon) {
    settingsIcon.addEventListener('click', showSettingsModal);
  }
  
  if (closeSettingsModal) {
    closeSettingsModal.addEventListener('click', hideSettingsModal);
  }
  
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveSettings);
  }
  
  if (cancelSettingsBtn) {
    cancelSettingsBtn.addEventListener('click', hideSettingsModal);
  }
  
  // 語音速度滑桿
  speechRateInput.addEventListener('input', updateSpeechRate);
    // 卡片功能選單
  if (speakMenuItem) {
    speakMenuItem.addEventListener('click', handleSpeakMenuItemClick);
  }
  
  if (summarizeMenuItem) {
    summarizeMenuItem.addEventListener('click', handleSummarizeMenuItemClick);
  }
  
  if (deleteMenuItem) {
    deleteMenuItem.addEventListener('click', handleDeleteMenuItemClick);
  }
  
  if (chatMenuItem) {
    chatMenuItem.addEventListener('click', handleChatMenuItemClick);
  }
  
  // 摘要視窗
  if (closeSummaryModal) {
    closeSummaryModal.addEventListener('click', hideSummaryModal);
  }
  
  if (closeSummaryBtn) {
    closeSummaryBtn.addEventListener('click', hideSummaryModal);
  }
  
  // 點擊頁面其他部分時關閉卡片選單
  document.addEventListener('click', (event) => {
    // 如果點擊的不是選單項目且選單正在顯示，則關閉選單
    if (!event.target.closest('.card-menu-icon') && 
        !event.target.closest('.context-menu') &&
        cardMenu.style.display === 'block') {
      cardMenu.style.display = 'none';
    }
  });
  
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

  // 對話視窗
  if (closeChatModal) {
    closeChatModal.addEventListener('click', hideChatModal);
  }
  
  if (chatInput) {
    chatInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        handleChatSend();
      }
    });
  }
  
  if (sendChatBtn) {
    sendChatBtn.addEventListener('click', handleChatSend);
  }
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
      <div class="card-menu-icon" data-id="${card.id}" title="功能選單">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      </div>    </div>
    <div class="card-content">${card.htmlContent || card.content || card.textContent}</div>
    ${card.url ? `<a href="${card.url}" class="card-url" target="_blank">${card.url}</a>` : ''}
  `;
  
  // 添加功能選單點擊事件
  const menuIcon = cardElement.querySelector('.card-menu-icon');
  menuIcon.addEventListener('click', (event) => {
    showCardMenu(event, card);
  });
  
  return cardElement;
}

// 顯示卡片功能選單
function showCardMenu(event, card) {
  event.stopPropagation();
  
  // 儲存當前操作的卡片
  currentActiveCard = card;
  
  // 設定選單位置
  const rect = event.target.getBoundingClientRect();
  cardMenu.style.top = `${rect.bottom + window.scrollY}px`;
  cardMenu.style.left = `${rect.left + window.scrollX - 120}px`; // 向左偏移，使選單在圖示下方
  
  // 顯示選單
  cardMenu.style.display = 'block';
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
    // 使用Turndown將HTML轉換為Markdown
    if (cardData.htmlContent) {
      const turndownService = new TurndownService();
      const markdownContent = turndownService.turndown(cardData.htmlContent);
      cardData.markdownContent = markdownContent;
    }
    
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
      exportContent += `內容:\n${card.markdownContent || card.content || card.textContent}\n\n`;
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

// 全域變數追蹤朗讀狀態
let isSpeaking = false;

// 朗讀卡片內容
function speakCardContent(content) {
  // 檢查瀏覽器是否支援語音合成 API
  if ('speechSynthesis' in window) {
    try {
      // 如果正在朗讀則停止
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        showNotification('已停止朗讀', 'info');
        // 更新選單項文字
        if (speakMenuItem) {
          speakMenuItem.innerHTML = '<span class="menu-icon">🔊</span>朗讀內容';
        }
        return;
      }
      
      // 停止任何進行中的朗讀
      window.speechSynthesis.cancel();
      
      // 建立新的語音合成訊息
      const speech = new SpeechSynthesisUtterance(content);
      
      // 設定語言為中文
      speech.lang = 'zh-TW';
      
      // 設定語音速度
      speech.rate = parseFloat(speechRateInput.value);
      
      // 當朗讀開始時
      speech.onstart = () => {
        isSpeaking = true;
        showNotification('開始朗讀內容', 'info');
        // 更新選單項文字
        if (speakMenuItem) {
          speakMenuItem.innerHTML = '<span class="menu-icon">⏸️</span>停止朗讀';
        }
      };
      
      // 當朗讀結束時
      speech.onend = () => {
        isSpeaking = false;
        showNotification('朗讀已完成', 'success');
        // 恢復選單項文字
        if (speakMenuItem) {
          speakMenuItem.innerHTML = '<span class="menu-icon">🔊</span>朗讀內容';
        }
      };
      
      // 朗讀發生錯誤時
      speech.onerror = (event) => {
        isSpeaking = false;
        // 恢復選單項文字
        if (speakMenuItem) {
          speakMenuItem.innerHTML = '<span class="menu-icon">🔊</span>朗讀內容';
        }
      };
      
      // 開始朗讀
      window.speechSynthesis.speak(speech);
    } catch (error) {
      console.error('朗讀功能發生錯誤:', error);
      showNotification('朗讀功能發生錯誤', 'error');
    }
  } else {
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

// 顯示設定視窗
function showSettingsModal() {
  // 載入已儲存的設定
  loadSettings();
  settingsModal.style.display = 'flex';
}

// 隱藏設定視窗
function hideSettingsModal() {
  settingsModal.style.display = 'none';
}

// 載入設定
function loadSettings() {
  chrome.storage.sync.get(['geminiApiKey', 'geminiModel', 'speechRate'], (result) => {
    if (result.geminiApiKey) {
      geminiApiKeyInput.value = result.geminiApiKey;
    }
    
    if (result.geminiModel) {
      geminiModelInput.value = result.geminiModel;
    } else {
      // 設定預設值
      geminiModelInput.value = 'gemini-2.0-flash';
    }
    
    if (result.speechRate) {
      speechRateInput.value = result.speechRate;
      updateSpeechRate();
    }
  });
}

// 儲存設定
function saveSettings() {  
  const settings = {
    geminiApiKey: geminiApiKeyInput.value,
    geminiModel: geminiModelInput.value,
    speechRate: speechRateInput.value
  };
  
  chrome.storage.sync.set(settings, () => {
    hideSettingsModal();
    showNotification('設定已儲存', 'success');
  });
}

// 處理朗讀選單項點擊
function handleSpeakMenuItemClick() {
  if (currentActiveCard) {
    speakCardContent(currentActiveCard.content || currentActiveCard.textContent);
  }
  cardMenu.style.display = 'none';
}

// 處理刪除選單項點擊
function handleDeleteMenuItemClick() {
  if (currentActiveCard) {
    showDeleteConfirmation(currentActiveCard.id);
  }
  cardMenu.style.display = 'none';
}

// 處理摘要選單項點擊
function handleSummarizeMenuItemClick() {
  if (currentActiveCard) {
    generateSummary(currentActiveCard);
  }
  cardMenu.style.display = 'none';
}

// 顯示摘要視窗
function showSummaryModal() {
  summaryModal.style.display = 'flex';
  summaryContent.innerHTML = '<div class="loading-indicator">正在產生摘要...</div>';
}

// 隱藏摘要視窗
function hideSummaryModal() {
  summaryModal.style.display = 'none';
}

// 生成摘要
async function generateSummary(card) {
  // 顯示摘要視窗
  showSummaryModal();
  
  try {
    // 從儲存的設定中獲取 API key 和模型
    chrome.storage.sync.get(['geminiApiKey', 'geminiModel'], async (result) => {      const apiKey = result.geminiApiKey;
      const model = result.geminiModel || 'gemini-2.0-flash';
      
      if (!apiKey) {
        summaryContent.innerHTML = `<div class="error">請先在設定中設置您的 Gemini API Key</div>`;
        return;
      }
      
      // 清空內容
      summaryContent.innerHTML = '<div class="streaming-text"></div>';
      const streamingElement = summaryContent.querySelector('.streaming-text');      try {
        // 建立 Gemini API 請求
        const prompt = `請以繁體中文簡潔摘要以下內容（100-200字）：\n\n${card.markdownContent}`;
        
        // 根據 Gemini API 文件，使用正確的 API 端點和 SSE 參數
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          })
        });        // 檢查回應是否成功
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API 請求失敗 (${response.status}): ${errorText}`);
        }
        
        // 處理 SSE 格式的串流回應
        // 使用 TextDecoder 串流解碼 UTF-8 文字
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let summary = '';
        
        // 處理 SSE 格式
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // 解碼伺服器回應的資料
          const chunk = decoder.decode(value);
          
          // SSE 格式為每行以 "data: " 開頭
          const lines = chunk.split('\n');
          for (const line of lines) {
            // 忽略空行和非資料行
            if (!line.trim() || !line.startsWith('data: ')) continue;
            
            // 提取 JSON 字串 (移除 "data: " 前綴)
            const jsonStr = line.substring(6);
            
            // 特殊處理結束訊號 "[DONE]"
            if (jsonStr.trim() === '[DONE]') {
              console.log('串流回應完成');
              continue;
            }
            
            try {
              const data = JSON.parse(jsonStr);
              if (data && data.candidates && data.candidates.length > 0) {
                const candidate = data.candidates[0];
                if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                  const part = candidate.content.parts[0];
                  if (part.text) {
                    summary += part.text;
                    streamingElement.textContent = summary;
                  }
                }
              }
            } catch (jsonError) {
              console.warn('解析 JSON 資料失敗:', jsonError);
              // 繼續處理其他行
            }
          }
        }
        
        if (summary.trim() === '') {
          streamingElement.textContent = '無法生成摘要，請稍後再試。';
        }
          } catch (apiError) {
        console.error('API 請求錯誤:', apiError);
        summaryContent.innerHTML = `<div class="error">生成摘要時發生錯誤: ${apiError.message}</div>`;
        
        // 顯示更詳細的錯誤資訊以協助偵錯
        console.log('API 設定：', {
          model: model,
          apiKeyLength: apiKey ? apiKey.length : 0,
          cardContentLength: card.content.length
        });
      }
    });
  } catch (error) {
    console.error('生成摘要失敗:', error);
    summaryContent.innerHTML = `<div class="error">生成摘要時發生錯誤: ${error.message}</div>`;
  }
}

// 處理對話選單項點擊
function handleChatMenuItemClick() {
  if (currentActiveCard) {
    startChat(currentActiveCard);
  }
  cardMenu.style.display = 'none';
}

// 顯示對話視窗
function showChatModal() {
  chatModal.style.display = 'flex';
  // 聚焦到輸入框
  setTimeout(() => {
    chatInput.focus();
  }, 100);
}

// 隱藏對話視窗
function hideChatModal() {
  chatModal.style.display = 'none';
  chatInput.value = '';
  
  // 停止任何可能進行中的請求
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
}

// 添加用戶訊息到對話視窗
function addUserMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'chat-message user-message';
  messageElement.textContent = message;
  
  chatContent.appendChild(messageElement);
  
  // 滾動到底部
  chatContent.scrollTop = chatContent.scrollHeight;
  
  // 添加到對話歷史
  chatHistory.push({
    role: 'user',
    parts: [{ text: message }]
  });
}

// 添加助手訊息到對話視窗
function addAssistantMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'chat-message assistant-message';
  messageElement.textContent = message;
  
  chatContent.appendChild(messageElement);
  
  // 滾動到底部
  chatContent.scrollTop = chatContent.scrollHeight;
  
  // 添加到對話歷史
  chatHistory.push({
    role: 'model',
    parts: [{ text: message }]
  });
}

// 添加載入指示器
function addLoadingIndicator() {
  const loadingElement = document.createElement('div');
  loadingElement.className = 'chat-message assistant-message';
  loadingElement.id = 'loadingMessage';
  loadingElement.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
  
  chatContent.appendChild(loadingElement);
  
  // 滾動到底部
  chatContent.scrollTop = chatContent.scrollHeight;
  
  return loadingElement;
}

// 移除載入指示器
function removeLoadingIndicator() {
  const loadingElement = document.getElementById('loadingMessage');
  if (loadingElement) {
    chatContent.removeChild(loadingElement);
  }
}

// 用於中止請求的控制器
let currentAbortController = null;

// 處理聊天送出
async function handleChatSend() {
  const message = chatInput.value.trim();
  
  // 檢查訊息是否為空
  if (!message || !currentChatCard) return;
  
  // 清空輸入框
  chatInput.value = '';
  
  // 添加用戶訊息
  addUserMessage(message);
  
  // 顯示載入指示器
  const loadingIndicator = addLoadingIndicator();
  
  try {
    // 從儲存的設定中獲取 API key 和模型
    chrome.storage.sync.get(['geminiApiKey', 'geminiModel'], async (result) => {
      const apiKey = result.geminiApiKey;
      const model = result.geminiModel || 'gemini-2.0-flash';
      
      if (!apiKey) {
        removeLoadingIndicator();
        addAssistantMessage('請先在設定中設置您的 Gemini API Key');
        return;
      }
      
      try {
        // 新建一個取消控制器來處理取消請求的情況
        currentAbortController = new AbortController();
        const signal = currentAbortController.signal;
        
        // 準備請求體
        const requestBody = {
          system_instruction: {
            parts: [{
              text: `你是知識問答助手。請根據以下文章以繁體中文進行回答，如果問題與文章無關則回覆不知道。\n\n${currentChatCard.markdownContent}`
            }]
          },
          contents: chatHistory,
          generation_config: {
            temperature: 0.4
          }
        };
        
        // 發送 API 請求
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: signal
          }
        );
        
        // 檢查回應是否成功
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API 請求失敗 (${response.status}): ${errorText}`);
        }
        
        // 移除載入指示器
        removeLoadingIndicator();
        
        // 建立新的助手訊息元素
        const assistantMessage = document.createElement('div');
        assistantMessage.className = 'chat-message assistant-message';
        chatContent.appendChild(assistantMessage);
        
        // 使用 TextDecoder 解碼響應流
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let responseText = '';
        
        // 讀取流式響應
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // 解碼收到的數據
          const chunk = decoder.decode(value);
          
          // 處理 SSE 格式的響應
          const lines = chunk.split('\n');
          for (const line of lines) {
            // 忽略空行和非數據行
            if (!line.trim() || !line.startsWith('data: ')) continue;
            
            // 提取 JSON 字符串（移除 "data: " 前綴）
            const jsonStr = line.substring(6);
            
            // 特殊處理結束信號 "[DONE]"
            if (jsonStr.trim() === '[DONE]') {
              console.log('流式回應完成');
              continue;
            }
            
            try {
              const data = JSON.parse(jsonStr);
              if (data && data.candidates && data.candidates.length > 0) {
                const candidate = data.candidates[0];
                if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                  const part = candidate.content.parts[0];
                  if (part.text) {
                    responseText += part.text;
                    assistantMessage.textContent = responseText;
                    
                    // 滾動到底部
                    chatContent.scrollTop = chatContent.scrollHeight;
                  }
                }
              }
            } catch (jsonError) {
              console.warn('解析 JSON 資料失敗:', jsonError);
            }
          }
        }
        
        // 將生成的回應加入對話歷史
        chatHistory.push({
          role: 'model',
          parts: [{ text: responseText }]
        });
        
      } catch (error) {
        // 檢查是否為中止錯誤
        if (error.name === 'AbortError') {
          console.log('請求已取消');
        } else {
          console.error('聊天 API 請求失敗:', error);
          removeLoadingIndicator();
          addAssistantMessage(`對話產生錯誤: ${error.message}`);
        }
      } finally {
        currentAbortController = null;
      }
    });
  } catch (error) {
    console.error('處理對話失敗:', error);
    removeLoadingIndicator();
    addAssistantMessage(`對話功能發生錯誤: ${error.message}`);
  }
}

// 開始對話
function startChat(card) {
  // 儲存當前卡片
  currentChatCard = card;
  
  // 重置對話歷史
  chatHistory = [];
  
  // 清空對話內容
  chatContent.innerHTML = '';
  
  // 添加歡迎訊息
  addAssistantMessage('您好！我可以協助您解答關於此知識卡片的問題。');
  
  // 顯示對話視窗
  showChatModal();
}

// 測試添加的對話功能運作正常
console.log('對話功能已添加');