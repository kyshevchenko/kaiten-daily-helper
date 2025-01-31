const toogleDisplayingElem = (elem, option) => {
  if (option) {
    elem.style.display = option;

    return;
  }

  const isElemHide = elem.style.display === "none";
  elem.style.display = isElemHide ? "block" : "none";

  return isElemHide;
};
