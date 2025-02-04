const seasonsMonths = {
  autumn: [9, 10, 11],
  winter: [12, 1, 2],
  sping: [3, 4, 5],
  summer: [6, 7, 8],
};

const getSeason = () => {
  const month = new Date().getMonth() + 1;
  return Object.keys(seasonsMonths).find((s) =>
    seasonsMonths[s].includes(month)
  );
};

const toggleDisableButton = (button, option) => {
  button.disabled = option;
};

const toogleDisplayingElem = (elem, option) => {
  if (option) {
    elem.style.display = option;

    return;
  }

  const isElemHide = elem.style.display === "none";
  elem.style.display = isElemHide ? "block" : "none";

  return isElemHide;
};

const toggleClasses = (elem, classesArray) => {
  classesArray.forEach((e) => elem.classList.toggle(e));
};

// сохранение своего списка в хранлище Хрома
function saveListToStorage(newList) {
  // TODO добавить и работу с досками (поиск в названии досок, а не только в swim-lane элементах) + добавить логику для !laneTitleElements.length => return

  // Находим все названия досок
  const boardTitleElements = document.querySelectorAll(
    'div[role="presentation"][data-test="board-title"]'
  );

  // находим все swim-lane
  const laneTitleElements = document.querySelectorAll(
    'div[role="button"][data-test="lane-title-text"]'
  );

  const allBoardsAndLanes = [...boardTitleElements, ...laneTitleElements];

  // Если swim-lane элементы не найдены на странице, пишем в консоль
  if (!allBoardsAndLanes.length) {
    console.log("Kaiten daily helper: Kaiten board not found.");
    return false;
  }

  const namesIndexes = {};

  // Ищем выбранные имена на досках в Кайтене
  for (const name of newList) {
    const matchingElements = allBoardsAndLanes.filter((element) => {
      return element.textContent.trim() === name;
    });

    const targetIndex = allBoardsAndLanes.findIndex(
      (e) => e === matchingElements[0]
    );

    if (targetIndex === -1) return false; // возвращаем false, если хотя бы одно имя на доске на досках и swim-lanes не найдено
    namesIndexes[name] = targetIndex;
  }

  // сортируем новый список
  const sortedListArray = Object.entries(namesIndexes).sort(
    (a, b) => a[1] - b[1]
  );
  const sortedListNamesIndex = Object.fromEntries(sortedListArray);
  const sortedListNames = Object.keys(sortedListNamesIndex);

  // сохраняем в хранилище хрома
  chrome.storage.sync.set({ ownList: sortedListNames }, () => {
    console.log("Kaiten daily helper: new list saved! ", newList);
  });
  return sortedListNames;
}

// Функция для разворачивания досок
function openBoards() {
  const allBoards = document.querySelectorAll(
    'div[data-test="board-container"]'
  );

  if (!allBoards.length) {
    console.log("Kaiten daily helper: no boards found.");
    return;
  }

  for (const board of allBoards) {
    const allLanesOnBoard = board.querySelectorAll('div[data-test="lane"]');

    if (!allLanesOnBoard.length) {
      const collapseBoardButton = board.querySelector(
        '[data-test="collapse-board-button"]'
      );
      if (collapseBoardButton) {
        collapseBoardButton.click();
      }
    }
  }
}

// Функция для разворачивания одной выбранной swim-lane
function uncollapseCurrentLane(lane) {
  const collapseLaneButton = lane.querySelector(
    '[data-test="title-collapse-button"]'
  );
  if (collapseLaneButton) {
    const openLane = () => collapseLaneButton.click();
    setTimeout(openLane, 0); // запускаем в setTimeout чтобы swim-lane раскрывались без остановки других процессов
  }
}

// функции падающего листа для осени
function setLeafColor() {
  const autumnColors = [
    "#fe6905",
    "#ae700b",
    "#a22a29",
    "#da2f03",
    "#ff8e0c",
    "#ffd700 ",
  ];
  if (!isWinterTime) {
    const randomColor =
      autumnColors[Math.floor(Math.random() * autumnColors.length)];
    document.querySelector("#leafSvg .st0").style.fill = randomColor;
  }
}

function animateLeaf() {
  const leaf = document.querySelector(".leaf");

  // Установка случайного цвета и начального положения
  setLeafColor();
  leaf.style.transform = `rotate(${Math.random() * 360}deg)`;

  // Установка начального состояния
  const randomLeft = Math.random() * (80 - 10) + 10; // рандом положение листьев
  const randomScale = 0.1 + Math.random() * 0.2; // рандом размер для листьев был 0.2 + Math.random() * 0.8
  leaf.style.top = "-150px";
  leaf.style.left = `${randomLeft}%`;
  leaf.style.transition = "none"; // Убираем переход для сброса
  leaf.style.opacity = "0.5";
  leaf.style.transform += ` scale(${randomScale})`;

  // Начальная анимация
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      leaf.style.transition = "top 15s linear, transform 5s linear";
      leaf.style.top = "120%"; // Конечное значение для анимации
    });
  });
}
// функции падающего листа для осени
