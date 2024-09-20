let windowOpen = false;
let randomList = [];
let isRandomMode;

// костыль для Кайтена. Чтобы сначала скролллить на самый верх до 1 элемента, а затем вниз к запрошенному спикеру
let firstSwimLaneElement;

// список по умолчанию
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
        // console.log("Список загружен из хрома: ", dailyList);
      } else {
        console.log("Своего списка в хранилище нет");
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
    <input type="checkbox" checked="true" id="name${i}" name="${e}" placeholder="Name ${i}">
    <label class="label" for="name${i}">${e}</label><br>`
      )
      .join("");
  };

  // svg падающего листа
  const fallenLeaf = `
<div class="leaf">
    <svg version="1.1" id="leafSvg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595.3 841.9">
        <style type="text/css">
            .st0{fill:#BA5517;}
        </style>
        <path id="XMLID_126_" class="st0" d="M115,456c0,0,124.3,70.6,129.3,70.7l-64.7,80c0,0,18,16.7,20,15.3s62-83,62-83
        s133.2,44.2,136.7,42.3c3.8-2.1-18.7-58.7-18.7-58.7s79.3-22.7,78.7-25.3c-0.7-2.7-20.7-22-20.7-22L505,426c0,0-52-10.7-52-13.3
        c0-2.7,6.7-30,6.7-30l-65.3,4.7L429,320l-46.7-6l6.7-92l-68,66l-37.3-28l-22,75.3l-40.7-56l-17.3,30l-43.3-34.7l19.3,92.7L136.3,356
        l23.3,64.9L115,456z"/>
    </svg>
</div>`;
  // svg падающего листа

  container.innerHTML = `
      <div >
        <div class="list" id="list">
        ${generateHTMLList(dailyList)}
        </div id="list">
        <br/>
        <button class="generate-button" id="generate-consistent-list">Запустить последовательный список</button>
        <button class="generate-button" id="generate-random-list">Запустить рандомный список</button>
        <br/><br/>

        <button class="button-form-create-list" id="button-form-create-list">Создать свой список</button>

        <div class="form-create-list" id="form-create-list">
        <textarea class="input-names" id="input-names" type="text" placeholder="Впиши сюда имена через запятую"></textarea>
        <br/><br/>
        <button id="button-generate-own-list">Создать</button>
        </div>

        <button id="next-name">Кто следующий?</button>
        ${fallenLeaf}
      </div>
      <p class="speaker" id="speaker"></p>
      <br/><br/>
    `;
  document.body.appendChild(container);
  const nextSpeakerField = document.getElementById("speaker");
  const nextButton = document.getElementById("next-name");
  nextButton.disabled = true;
  const formCreateList = document.getElementById("form-create-list");
  formCreateList.style.display = "none"; // TODO заменить на css, убрать дублирование
  const buttonFormCreateList = document.getElementById(
    "button-form-create-list"
  );

  // Функция для авто-скролла к спикеру
  function scrollToText(name) {
    // const laneTitleElements = document.querySelectorAll("div.v5-v5244"); // TODO удалить
    const laneTitleElements = document.querySelectorAll(
      'div[role="button"][data-test="lane-title-text"]'
    );
    // console.log("laneTitleElements --->", laneTitleElements);

    const matchingElements = Array.from(laneTitleElements).filter((element) => {
      return element.textContent.trim() === name;
    });

    // console.log("matchingElements ----->", matchingElements);

    // Если найдены элементы, прокручиваем к первому найденному (в Кайтене все равно прокручивает к низшей области блока :()
    if (matchingElements.length > 0) {
      matchingElements[0].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    } else {
      name && console.log(`Kaiten daily helper: Element with name ${name} not found`);
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
    nextButton.disabled = false;

    checkboxes.forEach((checkbox) => {
      checkbox.checked &&
        randomList.push(checkbox.nextElementSibling.textContent);
    });
    isRandomMode && shuffleArray(randomList); // перемешиваем список, если isRandomMode
    nextSpeakerField.textContent = "";

    // получаем самый верхний элемент для костыля скролла на самый верх в Кайтене
    const laneTitleElements = document.querySelectorAll(
      'div[role="button"][data-test="lane-title-text"]'
    );
    laneTitleElements.length ?
    firstSwimLaneElement = Array.from(laneTitleElements)[0].textContent.trim() : // получаем самый первый swim-lane элемент
    console.log("Kaiten daily helper: Kaiten board not found"); 
  }

  document
    .getElementById("generate-consistent-list")
    .addEventListener("click", () => {
      isRandomMode = false;
      generateList();
    });

  document
    .getElementById("generate-random-list")
    .addEventListener("click", () => {
      isRandomMode = true;
      generateList();
    });

  // переключение следующего спикера
  nextButton.addEventListener("click", () => {
    scrollToText(firstSwimLaneElement); // понимаемся всегда сначала наверх к 1му swim-lane

    // через 0.7 секунды идем вниз к доске выступающего
    setTimeout(() => {
      scrollToText(randomList[0]);

      // костыль для корректного скролла наверх к самому первому спикеру
      if (randomList[0] === firstSwimLaneElement) {
        // временная функция для поднятия на самый верх в начало
        function scrolltoTop() {
          let currentIteration = 2;
          while (5 > currentIteration) {
            setTimeout(() => {
              scrollToText(firstSwimLaneElement);
            }, currentIteration * 200); // идем еще чуть выше для Яны каждые 0.2 секунды // TODO переписать
            currentIteration = currentIteration + 1;
          }
        }
        scrolltoTop(); // поднимаем вверх еще 4 раза, докручиваем до 1й верхней таблички
      }

      if (randomList.length > 0) {
        if (randomList.length === 1) {
          randomList[0] = `${randomList[0]} (это последний спикер)`; // подсветить последнего спикера
          nextButton.disabled = true;
        }

        nextSpeakerField.textContent = randomList[0]; // показываем первый элемент в списке спикеров 
        randomList.shift(); // удаляем первый элемент
      } else if (randomList.length < 1) {
        // randomList[0] = "Сначала сгенерируйте новый список"; // TODO добавить текст после окончания
      }
    }, 700);

    // console.log("randomList[0] --->", randomList[0]);
    animateLeaf(); // включаем падающий лист
  });

  // создание своего нового списка
  document
    .getElementById("button-generate-own-list")
    .addEventListener("click", () => {
      const inputNames = document.getElementById("input-names");
      console.log("inputNames.value --->", inputNames.value);
      saveListToStorage(inputNames.value.split(", "));

      // скрываем форму добавления нового списка и показываем снова кнопку добавления
      formCreateList.style.display = "none";

      const list = document.getElementById("list");
      list.innerHTML = generateHTMLList(inputNames.value.split(", "));
      buttonFormCreateList.style.display = "block";
    });

  // кнопка показать/скрыть форму для создания нового списка
  document
    .getElementById("button-form-create-list")
    .addEventListener("click", () => {
      const newDisplay =
        formCreateList.style.display === "none" ? "block" : "none";
      formCreateList.style.display = newDisplay;
      // скрываем саму кнопку
      buttonFormCreateList.style.display = "none";
    });
}

// сохранение своего списка в хранлище Хрома
function saveListToStorage(newList) {
  chrome.storage.sync.set({ ownList: newList }, () => {
    console.log("Новый список сохранен");
  });
}

function toggleWindow() {
  const container = document.getElementById("my-extension-container");
  if (container) {
    const newDisplay = container.style.display === "none" ? "block" : "none";
    container.style.display = newDisplay;
    windowOpen = newDisplay === "block";
    // console.log("Toggled window");

    //скрываем форму создания нового списка и показываем кнопку
    formCreateListDisplay = document.getElementById("form-create-list");
    formCreateListDisplay.style.display = "none";
    buttonFormCreateList = document.getElementById("button-form-create-list");
    buttonFormCreateList.style.display = "block";
  } else {
    createWindow();
    windowOpen = true;
    // console.log("Created window");
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

// слушатель фонового обработчика
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleWindow") {
    toggleWindow();
    sendResponse({ windowOpen });
  }
});
