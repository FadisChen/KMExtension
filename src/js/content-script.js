// 全域變數
let isCapturing = false;
let selectedElement = null;
let overlay = null;

// 接收來自側邊欄的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startCapture') {
    startCapture();
    sendResponse({ status: 'capturing' });
  } else if (message.action === 'stopCapture') {
    stopCapture();
    sendResponse({ status: 'stopped' });
  }
  return true; // 保持連接開啟以進行非同步回應
});

// 開始擷取
function startCapture() {
  if (isCapturing) return;
  isCapturing = true;
  
  // 新增滑鼠事件監聽器
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('click', handleClick);
  
  // 建立覆蓋層元素
  createOverlay();
  
  // 變更游標樣式
  document.body.style.cursor = 'pointer';
  
  console.log('開始擷取模式');
}

// 停止擷取
function stopCapture() {
  if (!isCapturing) return;
  isCapturing = false;
  
  // 移除事件監聽器
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('click', handleClick);
  
  // 移除覆蓋層
  if (overlay) {
    document.body.removeChild(overlay);
    overlay = null;
  }
  
  // 恢復游標樣式
  document.body.style.cursor = 'default';
  
  console.log('停止擷取模式');
}

// 處理滑鼠移動
function handleMouseMove(event) {
  if (!isCapturing) return;
  
  // 獲取滑鼠下方的元素
  const element = document.elementFromPoint(event.clientX, event.clientY);
  
  if (element && element !== selectedElement) {
    selectedElement = element;
    highlightElement(element);
  }
}

// 處理點擊事件
function handleClick(event) {
  if (!isCapturing) return;
  event.preventDefault();
  event.stopPropagation();
  
  if (selectedElement) {
    captureElement(selectedElement);
    stopCapture();
  }
}

// 高亮顯示元素
function highlightElement(element) {
  if (!overlay) return;
  
  const rect = element.getBoundingClientRect();
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.left = `${rect.left + window.scrollX}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.display = 'block';
}

// 建立覆蓋層
function createOverlay() {
  overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.border = '2px dashed red';
  overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
  overlay.style.zIndex = '10000';
  overlay.style.pointerEvents = 'none';
  overlay.style.display = 'none';
  document.body.appendChild(overlay);
}

// 擷取元素內容
function captureElement(element) {
  if (!element) return;
  
  const pageTitle = document.title;
  const timestamp = new Date().toISOString();
  const textContent = element.innerText || element.textContent;
  //htmlContent需濾除<script>...</script>裡的內容
  const htmlContent = element.innerHTML.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // 發送擷取的內容給側邊欄
  chrome.runtime.sendMessage({
    action: 'capturedContent',
    data: {
      pageTitle,
      timestamp,
      textContent,
      htmlContent,
      url: window.location.href
    }
  }, (response) => {
    console.log('已擷取內容並發送到側邊欄', response);
  });
  
  console.log('已擷取內容:', textContent);
} 