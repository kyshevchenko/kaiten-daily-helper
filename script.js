let windowOpen = false;
let randomList = []; // список для отображения кадого следующего спикера
let startListLength; // Определение длины списка для прогресс-бара
let consistentList = []; // последовательный список // TODO для будущего разделения списков
let isRandomMode;
let firstSwimLaneElement; // самый первый swim-lane на доске
let currentSwimLane;
let lastSwimLaneElement; // самый последний из списка пользователя
let maxIndex = 0;
let listIndexes = {}; // хранилище { имя: lane-title-index }
let timer1; // для корректной прокрутки к элементу с позиционированием вверху экрана
let timer2;
let allElements; // вообще все laneTitleElements на сайте
let hasAllNamesOnBoard; // признак для обозначения отсутствия имени на доске в Кайтен при сохранении нового списка

// список по умолчанию при первом запуске расширения
let dailyList = [
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
        dailyList = result.ownList;
      } else {
        console.log("Kaiten daily helper: No own list in chrome's storage");
      }
      resolve();
    });
  });
}

// создание встроенного html-окна
async function createWindow() {
  if (document.getElementById("my-extension-container")) {
    return;
  }

  const container = document.createElement("div");
  container.id = "my-extension-container";
  container.className = "extension-container";

  // запрашиваем сохраненный ранее список в Хроме и устанавливаем его в dailyList
  await getListFromStorage();

  const generateHTMLList = (list) => {
    return list
      .map(
        (e, i) => `
    <div id="checkboxContainer">
      <input class="checkbox-extension" type="checkbox" checked="true" id="name${i}" name="${e}" placeholder="Name ${i}">
      <label class="checkbox-label">${e}</label><br>
    </div>`
      )
      .join("");
  };

  container.innerHTML = `
      <div >
        <div class="list" id="list">
        ${generateHTMLList(dailyList)}
        </div id="list">

        <br/>
        <div id="radioContainer">
          <input class="radio-extension" checked type="radio" value="true" id="consistent-mode" name="mode"/>
          <label class="radio-label-extension"for="consistent-mode">Последовательный порядок</label>
          <br/>
          <input class="radio-extension" type="radio" value="false" id="random-mode" name="mode"/>
          <label for="random-mode">Перемешать</label>
        </div>


        <div class="button-form-create-list tooltip-container" id="button-form-create-list">
          <button class="button-create-list" >${plusSvg}</button>
          <p class="button-create-list-describe tooltip">Создать свой список</p>
        </div>

        <div class="form-create-list" id="form-create-list">
          <textarea class="input-names" id="input-names" type="text" placeholder="Впиши сюда имена через запятую"></textarea>
          <br/>
          <br/>
          <button class="bubbly-button" id="button-generate-own-list">Сохранить</button>
          <button class="bubbly-button" id="button-cancel-own-list">Отмена</button>
        </div>

        <div class="bottom-block">
          <div class="bottom-buttons">
            <button class="bubbly-button" id="start-button">Начать заново${updateSvg}</button>
            <button class="bubbly-button" id="next-name">Кто следующий?</button>
         </div>
         <div class="progress-bar">
            ${progressBarSvg}
            <p class="progress-text"></p>
         </div>
        </div>

      </div>
      <p class="speaker" id="speaker"/></p>
      <br/>
      ${fallenLeafSvg}
      ${x5Svg}
    `;

  document.body.appendChild(container);
  const list = document.getElementById("list");
  const inputNames = document.getElementById("input-names");
  const nextSpeakerField = document.getElementById("speaker");
  const nextNameButton = document.getElementById("next-name");
  nextNameButton.disabled = true;
  const formCreateList = document.getElementById("form-create-list");
  formCreateList.style.display = "none"; // TODO заменить на css, убрать дублирование
  const buttonFormCreateList = document.getElementById(
    "button-form-create-list"
  );

  // переменные прогресс-бара
  const circle = document.querySelector(".progress-bar-circle");
  const progressValue = document.querySelector(".progress-text");
  const radius = circle.r.baseVal.value;
  const circleLength = radius * 2 * Math.PI;

  // функция установки значения прогресс-бара
  function setProgress() {
    const currentProgress = startListLength - randomList.length + 1;
    const progressPercentage = (currentProgress / startListLength) * 100;
    const circleFillValue =
      circleLength - (progressPercentage / 100) * circleLength;
    circle.style.strokeDashoffset = circleFillValue;
    progressValue.textContent = `${currentProgress}/${startListLength}`;
  }
  // функция очистки прогресс-бара
  function clearProgress() {
    progressValue.textContent = `0/${startListLength}`;
    circle.style.strokeDashoffset = circleLength;
  }

  // Функция для очистки всех тайм-аутов
  function clearAllTimeout(timersArray) {
    let count = 1;
    while (count < timersArray.length) {
      timersArray[count] && clearTimeout(timersArray[count]);
      count += 1;
    }
  }

  // Функция для авто-скролла к спикеру
  function scrollToText(name) {
    // isRandomMode = false; // TODO добавлено временно для изменения скролла при раннем решении (скролл сначала в самый низ, а потом к swim-lane)
    clearAllTimeout([timer1, timer2]); // убираем все таймауты скролла предыдущего клика //

    // опускаемся сначала к самому низкому элементу при isRandomMode // TODO как будто больше не нужно, удалить
    if (isRandomMode && lastSwimLaneElement) {
      lastSwimLaneElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    // TODO вынести это в генерацию списка по кнопке ОБНОВИТЬ
    const laneTitleElements = document.querySelectorAll(
      'div[role="button"][data-test="lane-title-text"]'
    );

    // Отфильтровываем, оставляем все laneTitleElements, содержащие имена спикеров // TODO вынести это в генерацию списка по кнопке ОБНОВИТЬ
    const matchingElements = Array.from(laneTitleElements).filter((element) => {
      return element.textContent.trim() === name;
    });

    if (matchingElements.length > 0) {
      currentSwimLane = matchingElements[0];
      const allElements = Array.from(laneTitleElements);

      const targetIndex = Array.from(laneTitleElements).findIndex(
        (e) => e === matchingElements[0]
      );

      // дизейбл кнопки след спикера во время скролла к Яне
      if (targetIndex === 0) {
        nextNameButton.disabled = true;
      }

      // Определяем предыдущий swim-lane чтобы осуществлять прокрутку до него при isRandomMode
      let targetElem =
        targetIndex > 0 && isRandomMode
          ? allElements[targetIndex - 1]
          : matchingElements[0];

      // доп функция для скролла к элементу, а затем к предыдущему элементы для корректного отображения на экране
      timer1 = setTimeout(() => {
        if (isRandomMode) {
          targetElem.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        } else {
          // прокручиваем до элемента к позиции start
          matchingElements[0].scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
          // а затем к предыдущему элементу к позиции start
          timer2 = setTimeout(() => {
            allElements[targetIndex - 1] &&
              allElements[targetIndex - 1].scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
          }, 700);
        }
      }, 700);

      const boardContainer = matchingElements[0].closest(
        '[data-test="board-container"]'
      );
      const allContainerLines = boardContainer.querySelectorAll(
        '[data-test="lane-title-text"]'
      );
      // доп прокрутка на самый верх поддоски, если это первый элемент на доске
      if (allContainerLines[0].textContent.trim() === name) {
        setTimeout(() => {
          boardContainer.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 1500);
      }
    } else {
      name && console.log(`Kaiten daily helper: Speaker ${name} not found on board`);
    }
  }

  // функция для перемешивания массива по алгоритму Фишера-Йейтса
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // Меняем местами элементы с индексами i и j
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // функция для генерации списка (обычного и рандомного)
  function generateList() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    randomList = [];

    checkboxes.forEach((checkbox) => {
      checkbox.checked &&
        randomList.push(checkbox.nextElementSibling.textContent);
    });
    startListLength = randomList.length;
    clearProgress();
    isRandomMode && shuffleArray(randomList); // перемешиваем список, если isRandomMode

    nextSpeakerField.textContent = "Список обновлен";
    nextSpeakerField.style.color = "rgba(128, 128, 128, 0.5)";

    const laneTitleElements = document.querySelectorAll(
      'div[role="button"][data-test="lane-title-text"]'
    );

    if (laneTitleElements.length) {
      // получаем самый верхний элемент для костыля скролла на самый верх в Кайтене
      firstSwimLaneElement =
        Array.from(laneTitleElements)[0].textContent.trim(); // получаем самый первый swim-lane элемент name

      // а теперь получаем самый нижний элемент чтобы опускаться в самый низ при рандомного скролле
      for (const name of randomList) {
        const matchingElements = Array.from(laneTitleElements).filter(
          (element) => {
            return element.textContent.trim() === name;
          }
        );

        allElements = Array.from(laneTitleElements);
        const targetIndex = Array.from(laneTitleElements).findIndex(
          (e) => e === matchingElements[0]
        );

        const prevElem =
          targetIndex > 0 ? allElements[targetIndex - 1] : matchingElements[0];

        listIndexes[name] = targetIndex;
      }

      for (const key in listIndexes) {
        if (listIndexes[key] > maxIndex) {
          maxIndex = listIndexes[key];
        }
      }

      lastSwimLaneElement = allElements[maxIndex]; // получаем элемент lastSwimLaneElement
    } else {
      console.log("Kaiten daily helper: Kaiten board not found");
    }

    // раскрытие всех свернутых swim-lane c именами из списка спикеров
    const allLanes = document.querySelectorAll('div[data-test="lane"]');
    let index = 0;

    // функция раскрытия каждой lane, запускаем через seTimeout чтобы не было тормозов
    function openLanes() {
      if (index >= allLanes.length) return; // Завершить, если все обработаны

      const lane = allLanes[index];
      const columns = lane.querySelectorAll('[data-test="column"]');

      if (!columns.length) {
        const collapseButton = lane.querySelector(
          '[data-test="title-collapse-button"]'
        );
        if (collapseButton) collapseButton.click();
      }

      index++;
      setTimeout(openLanes, 0);
    }

    openLanes();
    nextNameButton.disabled = false;
  }

  // слушатель радио кнопок
  document
    .getElementById("radioContainer")
    .addEventListener("change", (event) => {
      if (event.target.name === "mode") {
        isRandomMode = event.target.value === "false";
      }
    });

  // слушатель label имен
  const labels = Array.from(document.getElementsByClassName("checkbox-label"));
  labels.forEach((e) =>
    e.addEventListener("click", () => {
      isRandomMode = false;
      scrollToText(e.textContent);
    })
  );

  // слушатель кнопки start
  document.getElementById("start-button").addEventListener("click", () => {
    generateList();
  });

  // переключение следующего спикера // TODO нужно переписать всю логику слушателя
  nextNameButton.addEventListener("click", () => {
    setProgress();
    scrollToText(randomList[0]);

    // Обновление списка спикеров
    if (randomList.length > 0) {
      nextSpeakerField.style.color = "black";
      if (randomList.length === 1) {
        randomList[0] = `${randomList[0]} (это заключительный спикер)`; // подсветить последнего спикера
        nextNameButton.disabled = true;
      }

      nextSpeakerField.textContent = randomList[0]; // показываем первый элемент в списке спикеров
      randomList.shift(); // удаляем первый элемент
    }

    animateLeaf(); // включаем падающий лист
  });

  // создание своего нового списка
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
        list.innerHTML = generateHTMLList(sortedListNames);

        // слушатель label имен в новом списке //TODO убрать дублирование (вынести в функции все слушатели)
        const labels = Array.from(
          document.getElementsByClassName("checkbox-label")
        );
        labels.forEach((e) =>
          e.addEventListener("click", () => {
            isRandomMode = false;
            scrollToText(e.textContent);
          })
        );
      } else {
        inputNames.value = `${inputNames.value} \nНекоторые имена не были найдены на доске Кайтен. Исправьте список и сохраните еще раз.`;
      }
    });

  // кнопка отмены создания нового списка
  document
    .getElementById("button-cancel-own-list")
    .addEventListener("click", () => {
      formCreateList.style.display = "none"; // TODO вынести в функцию, убрать дублирование
      buttonFormCreateList.style.display = "block";
    });

  // кнопка "+" показать/скрыть форму для создания нового списка
  document
    .getElementById("button-form-create-list")
    .addEventListener("click", () => {
      const newDisplay =
        formCreateList.style.display === "none" ? "block" : "none";
      formCreateList.style.display = newDisplay;
      buttonFormCreateList.style.display = "none"; // скрываем саму кнопку
    });

  // анимация бабл-кнопки
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
    // получаем самый верхний элемент для костыля скролла на самый верх в Кайтене
    firstSwimLaneElement = Array.from(laneTitleElements)[0].textContent.trim(); // получаем самый первый swim-lane элемент name
    hasAllNamesOnBoard = true;
    listIndexes = {}; // очищаем listIndexes

    // а теперь получаем самый нижний элемент чтобы опускаться в самый низ при рандомного скролле
    for (const name of newList) {
      const matchingElements = Array.from(laneTitleElements).filter(
        (element) => {
          return element.textContent.trim() === name;
        }
      );

      allElements = Array.from(laneTitleElements);
      const targetIndex = Array.from(laneTitleElements).findIndex(
        (e) => e === matchingElements[0]
      );

      const prevElem =
        targetIndex > 0 ? allElements[targetIndex - 1] : matchingElements[0];

      listIndexes[name] = targetIndex;
      if (targetIndex === -1) hasAllNamesOnBoard = false; // будем возвращать false, если хотя бы одно имя на доске не найдено
    }

    // находим максимальный индекс swim-lane
    for (const key in listIndexes) {
      if (listIndexes[key] > maxIndex) {
        maxIndex = listIndexes[key];
      }
    }

    lastSwimLaneElement = allElements[maxIndex]; // получаем элемент lastSwimLaneElement

    // сортируем новый список
    const sortedListArray = Object.entries(listIndexes).sort(
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
  const container = document.getElementById("my-extension-container");
  if (container) {
    const newDisplay = container.style.display === "none" ? "block" : "none";
    container.style.display = newDisplay;
    windowOpen = newDisplay === "block";

    //скрываем форму создания нового списка и показываем кнопку
    formCreateList = document.getElementById("form-create-list");
    formCreateList.style.display = "none";
    buttonFormCreateList = document.getElementById("button-form-create-list");
    buttonFormCreateList.style.display = "block";
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
  const randomColor =
    autumnColors[Math.floor(Math.random() * autumnColors.length)];
  document.querySelector("#leafSvg .st0").style.fill = randomColor;
}
function animateLeaf() {
  const leaf = document.querySelector(".leaf");

  // Установка случайного цвета и начального положения
  setLeafColor();
  leaf.style.transform = `rotate(${Math.random() * 360}deg)`;

  // Установка начального состояния
  const randomLeft = Math.random() * (80 - 10) + 10; // рандом положение листьев
  const randomScale = 0.2 + Math.random() * 0.8; // рандом размер листьев
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

// слушатель фонового обработчика backgrounds.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleWindow") {
    toggleWindow();
    sendResponse({ windowOpen });
  }
});

// Анимация бабл-кнопки
function animateButton(e) {
  e.preventDefault;
  //reset animation
  e.target.classList.remove("animate");

  e.target.classList.add("animate");
  setTimeout(function () {
    e.target.classList.remove("animate");
  }, 700);
}
// Анимация бабл-кнопки
