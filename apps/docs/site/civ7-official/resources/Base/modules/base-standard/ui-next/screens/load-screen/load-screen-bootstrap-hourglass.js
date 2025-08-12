function showHourglass() {
  const animButtonContainer = document.getElementById("loading-curtain");
  if (animButtonContainer) {
    const flipbook = document.createElement("flip-book");
    flipbook.classList.add("absolute", "left-1\\/2", "top-1\\/2", "-mt-16", "-ml-16", "load-screen-fade-in");
    flipbook.id = "load-screen-flip-book";
    const flipbookDefinition = {
      fps: 30,
      atlas: [
        ["fs://game/hourglasses01.png", 128, 128, 512],
        ["fs://game/hourglasses02.png", 128, 128, 512],
        ["fs://game/hourglasses03.png", 128, 128, 1024, 13]
      ]
    };
    flipbook.setAttribute("data-flipbook-definition", JSON.stringify(flipbookDefinition));
    animButtonContainer.appendChild(flipbook);
  }
}
showHourglass();
//# sourceMappingURL=load-screen-bootstrap-hourglass.js.map
