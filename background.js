function updateIcon(isOpen) {
  const iconPath = isOpen ? "icon-on.png" : "icon-off.png";
  chrome.action.setIcon({ path: iconPath });
}

// Обработчик значка приложения
chrome.action.onClicked.addListener(() => {
  // Отправляем сообщение только на активные вкладки с контентным скриптом
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => { // TODO добавить tab.url.startsWith("https://kaiten.x5.ru/")
      chrome.tabs.sendMessage(
        tab.id,
        { action: "toggleWindow" },
        (response) => {
          // проверка на наличие ошибок 
          if (chrome.runtime.lastError) {
            console.log(
              `Error sending message: ${chrome.runtime.lastError.message}`
            );
          }
          // и меняем иконку расширения
          if (response) {
            updateIcon(response.windowOpen);
          }
        }
      );
    });
  });
});

// Проверяем статус загрузки и URL. И сбрасываем иконку после перезагрузки
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    tab.url.startsWith("https://kaiten.x5.ru/") // TODO изменить на  tab.url.startsWith("https://kaiten.*")
  ) {
    updateIcon(false);
  }
});
