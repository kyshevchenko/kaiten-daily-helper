let windowOpen = false;
let dailyList = []; // Список для отображения кадого следующего спикера
let speakersCount; // Количество спикеров для прогресс-бара // TODO убрать в функции
let scrollTimer; // для корректной прокрутки к элементу с позиционированием вверху экрана

const seasons = {
  autumn: [9, 10, 11],
  winter: [12, 1, 2],
  sping: [3, 4, 5],
  summer: [6, 7, 8],
};

const getSeason = () => {
  const month = new Date().getMonth() + 1;
  return Object.keys(seasons).find((s) => seasons[s].includes(month));
};

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

          <div class=" tooltip-container">
             <button id="button-display-release-table">${releaseSvg}</button>
             <p class="tooltip">Показать/скрыть таблицу релиза</p>
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
      <p class="speaker" id="speaker"/></p>
      <br/>
      ${fallenItem}
      ${x5Svg}
      ${christmasLights}
      ${santaHatImg}
    `;

  document.body.appendChild(container);
  const list = document.getElementById("list");
  const inputNames = document.getElementById("input-names");
  const nextSpeakerField = document.getElementById("speaker");
  const nextNameButton = document.getElementById("next-name");
  nextNameButton.disabled = true;
  const formCreateList = document.getElementById("form-create-list"); // Форма для создания нового списка
  formCreateList.style.display = "none"; // TODO заменить на css, убрать дублирование
  const buttonFormCreateList = document.getElementById(
    "button-form-create-list"
  );
  const santaHat = document.querySelector(".santa-hat");

  // Данные для релиз-таблицы
  const buttonDisplayReleaseTable = document.getElementById(
    "button-display-release-table"
  );
  let isCenterTabPosition = true;
  const centerPositionClass = "table-dialog-center";
  const rightPositionClass = "table-dialog-right";

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

  // Функция для авто-скролла к спикеру
  function scrollToText(name) {
    clearTimeout(scrollTimer); // убираем таймаут скролла предыдущего клика

    // TODO вынести это в генерацию списка по кнопке ОБНОВИТЬ
    const laneTitleElements = document.querySelectorAll(
      'div[role="button"][data-test="lane-title-text"]'
    );

    // Отфильтровываем, оставляем все laneTitleElements, содержащие имена спикеров
    const matchingElements = Array.from(laneTitleElements).filter(
      (e) => e.textContent.trim() === name
    );

    if (matchingElements.length > 0) {
      const allElements = Array.from(laneTitleElements);

      const targetIndex = Array.from(laneTitleElements).findIndex(
        (e) => e === matchingElements[0]
      );

      // находим все доски на странице и элементы с именами на ней
      const boardContainer = matchingElements[0].closest(
        '[data-test="board-container"]'
      );
      const allContainerLines = boardContainer.querySelectorAll(
        '[data-test="lane-title-text"]'
      );
      // доп прокрутка на самый верх доски, если это первый элемент на ней
      if (allContainerLines[0].textContent.trim() === name) {
        boardContainer.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }

      /* Если это не первый элемент на доске, выполняем другую логику скролла */
      const prevElem = allElements[targetIndex - 1]; // Определяем предыдущий (swim-lane) элемент, чтобы впоследствии осуществлять прокрутку до него

      // Сначала рокручиваем до требуемого элемента к позиции start
      matchingElements[0].scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      // а затем прокручиваем к предыдущему элементу к позиции start, чтобы требуемый отображался корректно
      scrollTimer = setTimeout(() => {
        prevElem &&
          prevElem.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 700);
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
    const namesCheckboxes = document.querySelectorAll(".checkbox-name");
    dailyList = [];

    // Добавляем в список всех спикеров с чекбоксами
    namesCheckboxes.forEach((checkbox) => {
      checkbox.checked &&
        dailyList.push(checkbox.nextElementSibling.textContent);
    });
    speakersCount = dailyList.length; // Уcтанавливаем количество в прогресс-бар
    clearProgress(); // очищаем прогресс-бар

    // Проверяем какой выбран режим списка (последовательный или рандом)?
    const isRandomMode =
      document.querySelector(".switch-checkbox").checked === true;
    // перемешиваем список, если isRandomMode
    if (isRandomMode) shuffleArray(dailyList);

    nextSpeakerField.textContent = `Список обновлен.\n(${
      isRandomMode ? "рандомный" : "последовательный"
    } порядок)`;
    nextSpeakerField.style.color = "rgba(128, 128, 128, 0.5)";

    const laneTitleElements = document.querySelectorAll(
      'div[role="button"][data-test="lane-title-text"]'
    );

    if (laneTitleElements.length) {
      // ищем все доски согласно отмеченному списку спикеров
      for (const name of dailyList) {
        const matchingElements = Array.from(laneTitleElements).filter(
          (element) => {
            return element.textContent.trim() === name;
          }
        );
        if (matchingElements.length === 0) {
          nextSpeakerField.textContent =
            "Не все имена найдены на странице Kaiten, измените список.";
          return;
        }
      }
    } else {
      console.log("Kaiten daily helper: Kaiten board not found");
    }

    // Функция раскрытия всех досок // TODO вынести в отдельный файл
    function openLanes() {
      const allLanes = document.querySelectorAll('div[data-test="lane"]');
      let index = 0;

      // if (index >= allLanes.length) return; // Завершить, если все обработаны
      while (index < allLanes.length) {
        const lane = allLanes[index];
        const columns = lane.querySelectorAll('[data-test="column"]');

        if (!columns.length) {
          const collapseButton = lane.querySelector(
            '[data-test="title-collapse-button"]'
          );
          if (collapseButton) {
            const click = () => collapseButton.click();
            setTimeout(click, 0); // запускаем в setTimeout чтобы доски раскрылись без тормозов
          }
        }
        index++;
      }
    }

    openLanes();
    nextNameButton.disabled = false;
  }

  // Слушатель label имен
  const labels = Array.from(document.getElementsByClassName("label-name"));
  labels.forEach((e) =>
    e.addEventListener("click", () => {
      scrollToText(e.textContent);
    })
  );

  // Слушатель кнопки start
  document
    .getElementById("start-button")
    .addEventListener("click", generateList);

  // Переключение следующего спикера // TODO нужно переписать всю логику слушателя
  nextNameButton.addEventListener("click", () => {
    setProgress();
    scrollToText(dailyList[0]);

    // Обновление списка спикеров
    if (dailyList.length > 0) {
      nextSpeakerField.style.color = "black";
      if (dailyList.length === 1) {
        dailyList[0] = `${dailyList[0]}\n(это заключительный спикер)`; // Подсветить последнего спикера
        nextNameButton.disabled = true;
      }

      nextSpeakerField.textContent = dailyList[0]; // Показываем первый элемент в списке спикеров
      dailyList.shift(); // Удаляем первый элемент
    }

    animateLeaf(); // Включаем падающий лист
  });

  // Создание своего нового списка
  document
    .getElementById("button-generate-own-list")
    .addEventListener("click", () => {
      if (!inputNames.value) return; // TODO убрать всю логику в saveListToStorage()

      const namesArray = inputNames.value
        .replace(/\n/g, "")
        .split(",")
        .map((e) => e.trim());
      const sortedListNames = saveListToStorage(namesArray);

      if (sortedListNames) {
        // скрываем форму добавления нового списка и показываем снова кнопку добавления
        formCreateList.style.display = "none"; // TODO вынести в функцию, убрать дублирование
        buttonFormCreateList.style.display = "block";
        if (santaHat) santaHat.style.display = "block";
        list.innerHTML = generateHTMLList(sortedListNames);

        // слушатель label имен в новом списке //TODO убрать дублирование (вынести в функции все слушатели)
        const labels = Array.from(
          document.getElementsByClassName("label-name")
        );
        labels.forEach((e) =>
          e.addEventListener("click", () => {
            scrollToText(e.textContent);
          })
        );
      } else {
        inputNames.value = `${inputNames.value} \nНекоторые имена не были найдены на доске Кайтен. Измените список и сохраните еще раз.`;
      }
    });

  // Кнопка отмены создания нового списка
  document
    .getElementById("button-cancel-own-list")
    .addEventListener("click", () => {
      formCreateList.style.display = "none"; // TODO вынести в функцию, убрать дублирование
      buttonFormCreateList.style.display = "block";
      if (santaHat) santaHat.style.display = "block";
    });

  // Кнопка "+" показать/скрыть форму для создания нового списка
  document
    .getElementById("button-form-create-list")
    .addEventListener("click", () => {
      const newDisplay =
        formCreateList.style.display === "none" ? "block" : "none";
      formCreateList.style.display = newDisplay;
      buttonFormCreateList.style.display = "none"; // скрываем саму кнопку
      if (santaHat) santaHat.style.display = "none";
    });

  /* Вспомогательные функции для слушателей и удаления слушателей */ // TODO вынести все функции по релиз-таблице
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
    tab.classList.add(
      isCenterTabPosition ? rightPositionClass : centerPositionClass
    );
    tab.classList.remove(
      isCenterTabPosition ? centerPositionClass : rightPositionClass
    );
    isCenterTabPosition = !isCenterTabPosition;
  };

  // Функция для добавления свечи
  const showCandle = () => {
    const candle = document.querySelector(".candle");
    candle.style.display = "block";
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
    if (dporMenuButton) {
      // Эмуляция нажатия клавиши "ArrowDown"
      const keyDownEvent = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        code: "ArrowDown",
        keyCode: 40,
        bubbles: true,
      });
      dporMenuButton.dispatchEvent(keyDownEvent);
    } else {
      console.log("Kaiten daily helper: release table not found!");
      return;
    }

    const dporMenu = document.querySelector('[role="listbox"]'); // Кнопка для смены вида таблицы
    const tableViewValue = dporMenu.querySelector('[data-value="1"]'); // value для вида Table
    const ListViewValue = dporMenu.querySelector('[data-value="3"]'); // value для вида List
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
    const currentPositionClass = isCenterTabPosition
      ? centerPositionClass
      : rightPositionClass;
    tableDialog.className = `table-dialog ${currentPositionClass}`;

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

  // Анимация бабл-кнопки
  const bubblyButtons = document.getElementsByClassName("bubbly-button");
  for (var i = 0; i < bubblyButtons.length; i++) {
    bubblyButtons[i].addEventListener("click", animateButton, false);
  }
}

// сохранение своего списка в хранлище Хрома
function saveListToStorage(newList) {
  // находиим все swim-lane
  const laneTitleElements = document.querySelectorAll(
    'div[role="button"][data-test="lane-title-text"]'
  );

  // сортируем согласно располжению swim-lane в Кайтене
  if (laneTitleElements.length) {
    let hasAllNamesOnBoard = true;
    const namesIndexes = {};
    let maxIndex = 0;

    // Ищем выбранные имена на досках в Кайтене
    for (const name of newList) {
      const matchingElements = Array.from(laneTitleElements).filter(
        (element) => {
          return element.textContent.trim() === name;
        }
      );

      const targetIndex = Array.from(laneTitleElements).findIndex(
        (e) => e === matchingElements[0]
      );

      namesIndexes[name] = targetIndex;
      if (targetIndex === -1) hasAllNamesOnBoard = false; // будем возвращать false, если хотя бы одно имя на доске не найдено
    }

    // находим максимальный индекс swim-lane
    for (const key in namesIndexes) {
      if (namesIndexes[key] > maxIndex) {
        maxIndex = namesIndexes[key];
      }
    }

    // сортируем новый список
    const sortedListArray = Object.entries(namesIndexes).sort(
      (a, b) => a[1] - b[1]
    );
    const sortedListNamesIndex = Object.fromEntries(sortedListArray);
    const sortedListNames = Object.keys(sortedListNamesIndex);

    if (hasAllNamesOnBoard) {
      // сохраняем в хранилище хрома
      chrome.storage.sync.set({ ownList: sortedListNames }, () => {
        console.log("Kaiten daily helper: new list saved! ", newList);
      });
      return sortedListNames;
    } else {
      return false;
    }
  } else {
    console.log("Kaiten daily helper: Kaiten board not found");
  }
}

function toggleWindow() {
  const container = document.getElementById("extension-container");
  if (container) {
    const newDisplay = container.style.display === "none" ? "block" : "none";
    container.style.display = newDisplay;
    windowOpen = newDisplay === "block";

    //скрываем форму создания нового списка и показываем кнопку
    formCreateList = document.getElementById("form-create-list");
    formCreateList.style.display = "none";
    buttonFormCreateList = document.getElementById("button-form-create-list");
    buttonFormCreateList.style.display = "block"; // TODO вынести в функцию, убрать дублирование
    const santaHat = document.querySelector(".santa-hat");
    if (santaHat) santaHat.style.display = "block";
  } else {
    createWindow();
    windowOpen = true;
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

  // Запуск анимации снова при завершении // - отключен
  // leaf.addEventListener(
  //   "transitionend",
  //   () => {
  //     animateLeaf();
  //   },
  //   { once: true }
  // );
}
// функции падающего листа для осени

// Анимация бабл-кнопки
function animateButton(e) {
  e.preventDefault;
  e.target.classList.remove("animate");

  e.target.classList.add("animate");
  setTimeout(function () {
    e.target.classList.remove("animate");
  }, 700);
}
// Анимация бабл-кнопки

// слушатель фонового обработчика backgrounds.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleWindow") {
    toggleWindow();
    sendResponse({ windowOpen });
  }
});
