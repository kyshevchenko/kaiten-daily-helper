let windowOpen = false;
let dailyList = [];
let speakersCount;// TODO убрать в функции

const isWinterTime = getSeason() === "winter";
const seasonAccesories = {
  fallenItem: isWinterTime ? snowflakeSvg : fallenLeafSvg,
  christmasLights: isWinterTime ? christmasLightsSVG : "",
  santaHatImg: isWinterTime ? santaHatSvg : "",
};
const { fallenItem, christmasLights, santaHatImg } = seasonAccesories;

// список по умолчанию при первом запуске расширения
let defaultList = [
  "Яна",
  "Саша",
  "Кирилл",
  "Маша",
  "Кирилл Front",
  "Диана",
  "Стас",
];

// получение своего списка из хранилища Хрома
function getListFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.sync.get("ownList", (result) => {
      if (result.ownList) {
        defaultList = result.ownList;
      } else {
        console.log("Kaiten daily helper: No own list in chrome's storage");
      }
      resolve();
    });
  });
}

// создание встроенного html-окна
async function createWindow() {
  if (document.getElementById("extension-container")) {
    return;
  }

  const container = document.createElement("div");
  container.id = "extension-container";

  // запрашиваем сохраненный ранее список в Хроме и устанавливаем его в defaultList
  await getListFromStorage();

  const generateHTMLList = (list) => {
    return list
      .map(
        (e, i) => `
    <div id="checkbox-container">
      <input class="checkbox-name" type="checkbox" checked="true" id="name${i}" name="${e}" placeholder="Name ${i}">
      <label class="label-name">${e}</label><br>
    </div>`
      )
      .join("");
  };

  container.innerHTML = `
      <div >
        <div class="list" id="list">
        ${generateHTMLList(defaultList)}
        </div id="list">

        <div class="switch-container">
          <label class="switch-daily">
            <input class="switch-checkbox" type="checkbox">
            <span class="switch-slider round"></span>
          </label>
          <span class="switch-label">Перемешать</span>
        </div>

        <div class="side-menu">
           <div class="tooltip-container">
             <button id="button-form-create-list">${plusSvg}</button>
             <p class="tooltip">Создать свой список</p>
          </div>

          <div class="tooltip-container">
             <button id="button-display-release-table">${releaseSvg}</button>
             <p class="tooltip">Показать/скрыть таблицу релиза</p>
          </div>

          <div class="tooltip-container">
            <button id="open-boards-button">${openBoardsSvg}</button>
            <p class="tooltip">Развернуть/свернуть доски</p>
          </div>
        </div>

        <div id="form-create-list">
          <textarea class="input-names" id="input-names" type="text" placeholder="Впиши сюда имена через запятую"></textarea>
          <br/>
          <br/>
          <button class="bubbly-button" id="button-generate-own-list">Сохранить</button>
          <button class="bubbly-button" id="button-cancel-own-list">Отмена</button>
        </div>

        <div class="bottom-block">
          <div class="bottom-buttons">
            <button class="bubbly-button" id="start-button">Начать заново${updateSvg}</button>
            <button class="bubbly-button" id="next-name">Кто следующий ?</button>
         </div>
         <div class="progress-bar">
            ${progressBarSvg}
            <p class="progress-text"></p>
         </div>
        </div>

      </div>
      <p id="speaker-field"/></p>
      <br/>
      ${fallenItem}
      ${x5Svg}
      ${christmasLights}
      ${santaHatImg}
    `;

  document.body.appendChild(container);
  const list = document.getElementById("list");
  const inputNames = document.getElementById("input-names");
  const nextSpeakerField = document.getElementById("speaker-field");
  const generateNewListButton = document.getElementById("start-button");
  const nextNameButton = document.getElementById("next-name");
  const formCreateList = document.getElementById("form-create-list"); // Форма для создания нового списка
  const openCollapseBoardsButton =
    document.getElementById("open-boards-button"); // Кнопка для разворачивания/сворачивания досок
  const openBoardsSVG =
    openCollapseBoardsButton.querySelector(".open-boards-svg");
  const sideMenu = document.querySelector(".side-menu");
  const santaHat = document.querySelector(".santa-hat");
  toggleDisableButton(nextNameButton, true);
  toogleDisplayingElem(sideMenu, "flex");

  // Данные для релиз-таблицы
  const buttonDisplayReleaseTable = document.getElementById(
    "button-display-release-table"
  );

  // Переменные прогресс-бара
  const circle = document.querySelector(".progress-bar-circle");
  const progressValue = document.querySelector(".progress-text");
  const radius = circle.r.baseVal.value;
  const circleLength = radius * 2 * Math.PI;

  // Функция установки значения прогресс-бара
  function setProgress() {
    const currentProgress = speakersCount - dailyList.length + 1;
    const progressPercentage = (currentProgress / speakersCount) * 100;
    const circleFillValue =
      circleLength - (progressPercentage / 100) * circleLength;
    circle.style.strokeDashoffset = circleFillValue;
    progressValue.textContent = `${currentProgress}/${speakersCount}`;
  }
  // Функция очистки прогресс-бара
  function clearProgress() {
    progressValue.textContent = `0/${speakersCount}`;
    circle.style.strokeDashoffset = circleLength;
  }

  // Функция для изменения текста поля следующего спикера
  function changeSpeakerField(speakerText, color) {
    nextSpeakerField.textContent = speakerText;
    if (color) nextSpeakerField.style.color = color;
  }

  // Функция для авто-скролла к спикеру
  function scrollToText(name) {

    // Находим все названия досок
    const boardTitleElements = document.querySelectorAll(
      'div[role="presentation"][data-test="board-title"]'
    );

    // TODO необходимо будет объединить с логикой скролла и по названиям досок (аналогично в saveListToStorage())
    const laneTitleElements = document.querySelectorAll(
      'div[role="button"][data-test="lane-title-text"]'
    );

    const allBoardsAndLanes = [...boardTitleElements, ...laneTitleElements];

    // Отфильтровываем, оставляем все элементы с именами спикеров
    const matchingElements = allBoardsAndLanes.filter(
      (e) => e.textContent.trim() === name
    );

    if (matchingElements.length > 0) {
      // находим все доски на странице и элементы с именами на ней
      const boardContainer = matchingElements[0].closest(
        '[data-test="board-container"]'
      );

      const isBoardTitleElem =
        matchingElements[0].getAttribute("data-test") === "board-title";

      const lane = matchingElements[0].closest('[data-test="lane"]');

      if (isBoardTitleElem) {
        const draggableBoard = boardContainer.querySelector(".draggableBoard");
        scrollToElem(draggableBoard);

        return;
      } else if (lane) {
        scrollToElem(lane);

        setTimeout(() => {
          const laneContainer = lane.parentElement;
          laneContainer.style.overflow = "auto";
          laneContainer.scrollTop += 100;
        }, 500);
        return;
      } else {
        scrollToElem(matchingElements[0]);
      }
    } else {
      name &&
        console.log(`Kaiten daily helper: Speaker ${name} not found on board`);
    }
  }

  // Функция для перемешивания массива по алгоритму Фишера-Йейтса
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // Меняем местами элементы с индексами i и j
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Функция для генерации списка (обычного и рандомного)
  function generateList() {
    toggleDisableButton(generateNewListButton, true);
    toggleDisableButton(nextNameButton, true);
    const loaderSvg = generateNewListButton.querySelector("svg");
    toggleClasses(loaderSvg, ["loader-effect"]);
    changeSpeakerField("");
    const namesCheckboxes = document.querySelectorAll(".checkbox-name");
    dailyList = [];
    let hasKaitenElems = true;

    // Добавляем в список всех спикеров с чекбоксами
    namesCheckboxes.forEach((checkbox) => {
      checkbox.checked &&
        dailyList.push(checkbox.nextElementSibling.textContent);
    });
    speakersCount = dailyList.length; // Уcтанавливаем количество в прогресс-бар
    clearProgress(); // очищаем прогресс-бар

    const isRandomMode =
      document.querySelector(".switch-checkbox").checked === true;
    if (isRandomMode) shuffleArray(dailyList);

    openBoards(); // Раскрываем доски, если свернуты

    const boardTitleElements = document.querySelectorAll(
      'div[role="presentation"][data-test="board-title"]'
    );

    const laneTitleElements = document.querySelectorAll(
      'div[role="button"][data-test="lane-title-text"]'
    );

    // Находим все элементы согласно отмеченному списку спикеров
    const matchingElements = [
      ...boardTitleElements,
      ...laneTitleElements,
    ].filter((e) => dailyList.includes(e.textContent.trim()));

    if (laneTitleElements.length) {
      const allLanes = document.querySelectorAll('div[data-test="lane"]');

      // Проверяем свернуты ли swim-lanes и разворачиваем их // TODO выделить в функцию, убрать дублирование
      for (const lane of allLanes) {
        const columns = lane.querySelectorAll(".hover_container");
        if (!columns.length) uncollapseCurrentLane(lane);
      }

      if (!matchingElements.length) {
        changeSpeakerField(
          "Раскройте доски или смените страницу. Не все имена найдены."
        );
        hasKaitenElems = false;
      }
    } else {
      console.log("Kaiten daily helper: Kaiten board not found");
      changeSpeakerField(
        "Раскройте доски или смените страницу. Не все имена найдены."
      );
      hasKaitenElems = false;
    }

    const updatetListMessage = `Список обновлен.\n(${
      isRandomMode ? "рандомный" : "последовательный"
    } порядок)`;

    setTimeout(() => {
      scrollToText(boardTitleElements[0].textContent.trim());
      toggleClasses(loaderSvg, ["loader-effect"]);
      toggleDisableButton(nextNameButton, false);
      toggleDisableButton(generateNewListButton, false);
      if (hasKaitenElems)
        changeSpeakerField(updatetListMessage, "rgba(128, 128, 128, 0.95)");

      if (openBoardsSVG.classList.contains("collapsed-boards-icon")) {
        toggleClasses(openBoardsSVG, [
          "collapsed-boards-icon",
          "opened-boards-icon",
        ]);
      }
    }, 0);
  }

  // Слушатель label имен
  const labels = Array.from(document.getElementsByClassName("label-name"));
  labels.forEach((e) =>
    e.addEventListener("click", () => {
      scrollToText(e.textContent);
    })
  );

  // Слушатель кнопки start
  generateNewListButton.addEventListener("click", generateList);

  // Переключение следующего спикера
  nextNameButton.addEventListener("click", () => {
    setProgress();
    scrollToText(dailyList[0]);

    // Обновление списка спикеров
    const isLastSpeaker = dailyList.length === 1;
    const nextSpeaker = isLastSpeaker
      ? `${dailyList[0]}\n(это заключительный спикер)`
      : dailyList[0];
    toggleDisableButton(nextNameButton, isLastSpeaker);
    changeSpeakerField(nextSpeaker, "black");
    dailyList.shift();

    animateLeaf(); // Включаем падающий лист
  });

  // Создание своего нового списка
  document
    .getElementById("button-generate-own-list")
    .addEventListener("click", () => {
      if (!inputNames.value) return;

      const sortedListNames = saveListToStorage(inputNames);

      if (!sortedListNames) {
        changeSpeakerField(
          "Некоторые имена не были найдены. Измените список.",
          "black"
        );
        return;
      }

      // скрываем форму добавления нового списка и показываем снова кнопку добавления
      toogleDisplayingElem(formCreateList);
      toogleDisplayingElem(sideMenu, "flex");
      if (santaHat) toogleDisplayingElem(santaHat);
      list.innerHTML = generateHTMLList(sortedListNames);

      // слушатель label имен в новом списке
      const labels = Array.from(document.getElementsByClassName("label-name"));
      labels.forEach((e) =>
        e.addEventListener("click", () => {
          scrollToText(e.textContent);
        })
      );
      changeSpeakerField("Новый список был успешно создан!");
    });

  // Кнопка отмены создания нового списка
  document
    .getElementById("button-cancel-own-list")
    .addEventListener("click", () => {
      toogleDisplayingElem(formCreateList);
      toogleDisplayingElem(sideMenu, "flex");
      if (santaHat) toogleDisplayingElem(santaHat, "block");
    });

  // Кнопка "+" показать форму для создания нового списка
  document
    .getElementById("button-form-create-list")
    .addEventListener("click", () => {
      toogleDisplayingElem(formCreateList, "block");
      toogleDisplayingElem(sideMenu, "none");
      if (santaHat) toogleDisplayingElem(santaHat, "none");
    });

  /* Вспомогательные функции для слушателей и удаления слушателей */
  // Функция для обработки кликов по строкам таблицы
  const handleRowClick = (event) => {
    const taskId = event.currentTarget.getAttribute("data-id");
    const link = `https://kaiten.x5.ru/space/3260/card/${taskId}`;
    window.open(link, "_blank");
  };

  // Функция для изменения положения релиз-таблицы
  const changeTabPosition = () => {
    const tab = document.querySelector(".table-dialog");

    // Меняем классы и переменную для положения таблицы
    toggleClasses(tab, ["table-dialog-center", "table-dialog-right"]);
  };

  // Функция для добавления свечи
  const showCandle = () => {
    const candle = document.querySelector(".candle");
    toogleDisplayingElem(candle, "block");
  };

  // Функция для удаления релиз-таблицы
  const closeReleaseTable = () => {
    const tab = document.querySelector(".table-dialog");

    if (tab) {
      const tableRows = tab.querySelectorAll(".custom-table-row");
      const tableCloseIcon = tab.querySelector(".table-close-icon");
      const resizeWindowButton = tab.querySelector(".resize-window");
      const updateReleaseButton = document.querySelectorAll(".update-svg");
      const candleActivator = tab.querySelector(".candle-activator");

      // Удаляем все слушатели событий для строк таблицы
      tableRows.forEach((row) => {
        row.removeEventListener("click", handleRowClick); // Удаляем слушатель
      });
      tableCloseIcon.removeEventListener("click", closeReleaseTable); // Удаляем слушатель иконки закрытия окна
      resizeWindowButton.removeEventListener("click", changeTabPosition); // Удаляем слушатель иконки изменения позиции окна
      updateReleaseButton[1].removeEventListener("click", updateReleaseTable); // Удаляем слушатель кнопки Обновить
      candleActivator.removeEventListener("click", showCandle); // Удаляем слушатель для свечи

      document.body.removeChild(tab); // Удаляем само окно релиз-таблицы
      return true;
    }
  };

  // Функция для обновления релиз-таблицы
  const updateReleaseTable = () => {
    closeReleaseTable(); // Удаляем окно релиз-таблицы
    buttonDisplayReleaseTable.click(); // Открываем окно снова
  };

  // Слушатель кнопки для отображения релиз-таблицы
  buttonDisplayReleaseTable.addEventListener("click", () => {
    // закрываем окно с таблицей, если оно отображается
    const isTableOpen = closeReleaseTable();
    if (isTableOpen) return;

    const dporMenuButton = document.querySelector('[aria-haspopup="listbox"]');
    if (!dporMenuButton) {
      console.log("Kaiten daily helper: release table not found!");

      return;
    }

    // Эмуляция нажатия клавиши "ArrowDown"
    const keyDownEvent = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      code: "ArrowDown",
      keyCode: 40,
      bubbles: true,
    });
    dporMenuButton.dispatchEvent(keyDownEvent);

    const dporMenu = document.querySelector('[role="listbox"]'); // Кнопка для смены вида таблицы
    const tableViewValue = dporMenu.querySelector('[data-value="1"]'); // Кнопка для вида Table
    const ListViewValue = dporMenu.querySelector('[data-value="3"]'); // Кнопка для вида List
    ListViewValue.click();
    tableViewValue.click();

    // Копирование всех данных из таблицы
    const tableContent = document.querySelector('[data-test="some"]');
    const childDivs = Array.from(tableContent.children).filter(
      (child) => child.tagName === "DIV"
    );

    // Получаем все элементы <p> внутри второго дочернего <div> (все имена тасок)
    const pElems = childDivs[1].querySelectorAll("p");
    const taskNames = Array.from(pElems);
    const taskNamesText = taskNames.map((e) => e.textContent).join("\n");
    const taskCount = taskNames.length;

    // Получаем всю остальную инфу по таскам
    const tasksInfo = Array.from(childDivs[2].children).filter(
      (child) => child.tagName === "DIV"
    );

    tasksInfo.splice(0, 6); // Удаляем первые 7 элементов для дальнейшей корректной работы
    const info = {}; // хранение всей инф по таскам
    let count = 1; // счетчик количества тасок

    while (tasksInfo.length > 0) {
      if (!tasksInfo[0].textContent) tasksInfo.splice(0, 6);

      const avatarData = tasksInfo[2].querySelector("img");
      const avatar = avatarData ? `<img src=${avatarData.src}/>` : "";

      info[count] = {
        name: taskNames[count - 1].textContent,
        ID: tasksInfo[0].textContent,
        status: tasksInfo[1].textContent,
        avatar,
        responsible: tasksInfo[2].textContent,
        tags: tasksInfo[3].textContent,
      };
      tasksInfo.splice(0, 6);
      count++;
    }
    const gitTaskList = taskNames
      .map((e, i) => {
        const id = info[i + 1].ID;
        return `- [ABP-${id}](https://kaiten.x5.ru/space/3260/card/${id}) ${e.textContent}`;
      })
      .join("\n");

    //Функция для наполнения таблицы
    const getTableContent = (info) => {
      let table = "";

      for (const i in info) {
        table += `
        <tr class="custom-table-row" data-id="${info[i].ID}">
          <td>${info[i].name}</td>
          <td>${info[i].ID}</td>
          <td>${info[i].status}</td>
          <td class="img-cell">${info[i].avatar} ${info[i].responsible}</td>
        </tr>
        `;
      }
      return table;
    };

    // Создаем и наполняем таблицу
    const customTable = `
    <table class="custom-table">
    <thead class="custom-table-head">
      <tr>
        <th>Название задачи (${taskCount})${copySvg}</th>
        <th class="id-column-header">ID</th>
        <th class="candle-activator">Статус</th>
        <th>Исполнитель
          <div class="window-button-container">${updateSvg} ${resizeWindow} ${closeIconSvg}</div>
        </th>
      </tr>
    </thead>
    <tbody>
      ${getTableContent(info)}
    </tbody>
    </table>
    <div class="candle-container">
      <div class="candle"/>
    </div>
    `;

    const tableDialog = document.createElement("div");
    tableDialog.className = `table-dialog table-dialog-center`;
    tableDialog.innerHTML = customTable;

    if (taskCount < 4) {
      const candle = tableDialog.querySelector(".candle");
      candle.classList.add("short-candle");
    }

    document.body.appendChild(tableDialog); // Начинаем отображать окно

    // Cлушатель событий для каждой строки таблицы
    const tableRows = document.querySelectorAll(".custom-table-row");
    tableRows.forEach((e) => e.addEventListener("click", handleRowClick));

    // Слушатель событий для иконки крестика в релиз-таблице
    const tableCloseIcon = document.querySelector(".table-close-icon");
    tableCloseIcon.addEventListener("click", closeReleaseTable);

    // Слушатель событий для иконки обновления в релиз-таблице
    const updateReleaseButton = document.querySelectorAll(".update-svg");
    updateReleaseButton[1].addEventListener("click", updateReleaseTable);

    // Слушатель кнопки смены позиции окна
    const resizeWindowButton = document.querySelector(".resize-window");
    resizeWindowButton.addEventListener("click", changeTabPosition);

    // Слушатель для свечи
    const candleActivator = document.querySelector(".candle-activator");
    candleActivator.addEventListener("click", showCandle);

    // Слушатель для иконки копирования
    const copyButton = document.querySelector(".copy-button");
    copyButton.addEventListener("click", () => {
      navigator.clipboard.writeText(taskNamesText);
    });

    // Слушатель столбца ID для копирования инф в гит
    const idColumnHeader = document.querySelector(".id-column-header");
    idColumnHeader.addEventListener("click", () => {
      navigator.clipboard.writeText(gitTaskList);
    });
  });

  // Слушатель open-boards-button кнопки
  openCollapseBoardsButton.addEventListener("click", () => {
    // Функция для изменения состояния кнопки
    const toogleCollapseButton = (
      operationMoment,
      isNextNameButtonActive,
      openBoardsSVG
    ) => {
      const isButtonPressed = operationMoment === "pressButton";

      toggleDisableButton(openCollapseBoardsButton, isButtonPressed);
      toggleDisableButton(generateNewListButton, isButtonPressed);
      if (isNextNameButtonActive)
        toggleDisableButton(nextNameButton, isButtonPressed);

      toggleClasses(openBoardsSVG, ["black-color-icon", "gray-color-icon"]);

      // Переворачиваем иконку во время нажатия кнопки
      if (isButtonPressed) {
        toggleClasses(openBoardsSVG, [
          "collapsed-boards-icon",
          "opened-boards-icon",
        ]);
      }
    };

    // Функция раскрытия swim-lane элементов на каждой доске, если они свернуты
    const openLanes = (
      isBoardsCollapsed,
      isNextNameButtonActive,
      openBoardsSVG
    ) => {
      const allLanes = document.querySelectorAll('div[data-test="lane"]');

      for (const lane of allLanes) {
        const columns = lane.querySelectorAll(".hover_container");

        if (
          (!columns.length && isBoardsCollapsed) ||
          (columns.length && !isBoardsCollapsed)
        )
          uncollapseCurrentLane(lane);
      }

      // Прокручиваем на самый верх страницы после раскрытия всех досок
      setTimeout(() => {
        const firstBoard = document.querySelector(
          '[data-test="board-container"]'
        );
        scrollToElem(firstBoard);

        toogleCollapseButton(
          "releaseButton",
          isNextNameButtonActive,
          openBoardsSVG
        );
      }, 0);
    };

    // Функция раскрытия досок, если они свернуты
    const uncollapseBoards = (openBoards) => {
      const isNextNameButtonActive = nextNameButton.disabled === false;

      const isBoardsCollapsed = openBoardsSVG.classList.contains(
        "collapsed-boards-icon"
      );

      toogleCollapseButton(
        "pressButton",
        isNextNameButtonActive,
        openBoardsSVG
      );

      openBoards();

      openLanes(isBoardsCollapsed, isNextNameButtonActive, openBoardsSVG);
    };

    uncollapseBoards(openBoards);
  });
}

function toggleWindow() {
  const container = document.getElementById("extension-container");
  if (container) {
    windowOpen = toogleDisplayingElem(container);

    //скрываем форму создания нового списка и показываем кнопку
    const formCreateList = document.getElementById("form-create-list");
    const sideMenu = document.querySelector(".side-menu");
    const santaHat = document.querySelector(".santa-hat");
    toogleDisplayingElem(formCreateList, "none");
    toogleDisplayingElem(sideMenu, "flex");
    if (santaHat) toogleDisplayingElem(santaHat, "block");

    return;
  } else {
    createWindow();
    windowOpen = true;
  }
}

// слушатель фонового обработчика backgrounds.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleWindow") {
    toggleWindow();
    sendResponse({ windowOpen });
  }
});
