/**
 * Afresto AI Assistant - Background Service Worker
 * Mengatur pembukaan Chrome Side Panel dan tata kelola tab aktif.
 */

// Buka Side Panel secara otomatis saat ikon ekstensi diklik di toolbar
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err) => console.error("Gagal mengonfigurasi setPanelBehavior:", err));
  }
  console.log("Afresto AI Assistant berhasil diinstal.");
});

// Listener untuk pesan antar modul (jika diperlukan delegasi background)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PING_BACKGROUND") {
    sendResponse({ status: "OK", timestamp: Date.now() });
  } else if (message.action === "OPEN_SIDE_PANEL") {
    if (sender.tab && chrome.sidePanel && chrome.sidePanel.open) {
      chrome.sidePanel.open({ windowId: sender.tab.windowId })
        .then(() => sendResponse({ success: true }))
        .catch((err) => {
          console.error("Gagal membuka sidePanel:", err);
          sendResponse({ success: false, error: err.message });
        });
      return true;
    } else {
      sendResponse({ success: false, error: "sidePanel API tidak tersedia atau bukan tab" });
    }
  }
  return true;
});
