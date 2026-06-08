function drag(ev) {
  ev.dataTransfer.setData("text", ev.target.id);
  ev.dataTransfer.setData("type", ev.target.getAttribute("data-type"));
}

window.drag = drag;

const synonymBed = document.getElementById("synonyms-bed");
const antonymBed = document.getElementById("antonyms-bed");

[synonymBed, antonymBed].forEach((bed) => {
  bed.addEventListener("dragover", (e) => {
    e.preventDefault();
    bed.classList.add("drag-over");
  });

  bed.addEventListener("dragleave", () => {
    bed.classList.remove("drag-over");
  });

  bed.addEventListener("drop", (e) => {
    e.preventDefault();
    bed.classList.remove("drag-over");

    const id = e.dataTransfer.getData("text");
    const type = e.dataTransfer.getData("type");
    const element = document.getElementById(id);

    const isSynonymBed = bed.id === "synonyms-bed";
    const isCorrect = (isSynonymBed && type === "synonym") || (!isSynonymBed && type === "antonym");

    if (isCorrect) {
      element.classList.remove("bg-white", "border-border-subtle");
      element.classList.add(isSynonymBed ? "bg-primary-container" : "bg-tertiary-container", "text-white", "success-glow");
      element.setAttribute("draggable", "false");

      const targetContainer = isSynonymBed ? document.getElementById("synonym-chips") : document.getElementById("antonym-chips");
      targetContainer.appendChild(element);

      if (window.navigator.vibrate) {
        window.navigator.vibrate(20);
      }
    } else {
      element.classList.add("animate-bounce");
      setTimeout(() => element.classList.remove("animate-bounce"), 500);
    }
  });
});

window.renderFooter({ active: "library" });
