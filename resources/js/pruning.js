(function () {
  const synonymBed = document.getElementById("synonyms-bed");
  const antonymBed = document.getElementById("antonyms-bed");
  const synonymChips = document.getElementById("synonym-chips");
  const antonymChips = document.getElementById("antonym-chips");
  const wordBank = document.getElementById("word-bank");
  const progressBar = document.getElementById("progress-bar");

  let session = null;
  let currentWord = null;
  let currentIndex = 0;
  let remainingCorrectDrops = 0;

  function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    ev.dataTransfer.setData("type", ev.target.getAttribute("data-type"));
  }

  function shuffle(items) {
    const cloned = [...items];
    for (let index = cloned.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [cloned[index], cloned[randomIndex]] = [cloned[randomIndex], cloned[index]];
    }
    return cloned;
  }

  function updateProgress() {
    const total = session.wordIds.length;
    const completion = Math.min(100, Math.round((currentIndex / Math.max(1, total)) * 100));
    progressBar.style.width = `${completion}%`;
  }

  function makeWordChip(wordText, type, index) {
    const chip = document.createElement("div");
    chip.className = "word-chip px-5 py-3 bg-white border-2 border-border-subtle rounded-full font-button-text text-button-text text-on-surface shadow-sm hover:border-outline transition-all active:scale-90";
    chip.setAttribute("draggable", "true");
    chip.setAttribute("data-type", type);
    chip.id = `word-chip-${currentWord.id}-${index}`;
    chip.textContent = wordText;
    chip.addEventListener("dragstart", drag);
    return chip;
  }

  function renderWord(word) {
    document.getElementById("pruning-word").textContent = word.word;
    synonymChips.innerHTML = "";
    antonymChips.innerHTML = "";
    wordBank.innerHTML = "";

    const synonymItems = (word.synonyms || []).slice(0, 2).map((label) => ({ label, type: "synonym" }));
    const antonymItems = (word.antonyms || []).slice(0, 2).map((label) => ({ label, type: "antonym" }));
    const chips = shuffle([...synonymItems, ...antonymItems]);

    remainingCorrectDrops = chips.length;
    chips.forEach((chipData, index) => {
      const chip = makeWordChip(chipData.label, chipData.type, index);
      wordBank.appendChild(chip);
    });
  }

  async function moveNextWord() {
    currentIndex += 1;
    await window.PaperGardenSessionStore.updateStageCursor("pruning", currentIndex);
    updateProgress();

    if (currentIndex >= session.wordIds.length) {
      await window.PaperGardenSessionStore.completeActiveSession();
      window.location.href = "index.html";
      return;
    }

    currentWord = await window.PaperGardenVocabStore.getWordById(session.wordIds[currentIndex]);
    renderWord(currentWord);
  }

  [synonymBed, antonymBed].forEach((bed) => {
    bed.addEventListener("dragover", (event) => {
      event.preventDefault();
      bed.classList.add("drag-over");
    });

    bed.addEventListener("dragleave", () => {
      bed.classList.remove("drag-over");
    });

    bed.addEventListener("drop", async (event) => {
      event.preventDefault();
      bed.classList.remove("drag-over");

      const id = event.dataTransfer.getData("text");
      const type = event.dataTransfer.getData("type");
      const element = document.getElementById(id);
      if (!element || element.getAttribute("draggable") === "false") {
        return;
      }

      const isSynonymBed = bed.id === "synonyms-bed";
      const isCorrect = (isSynonymBed && type === "synonym") || (!isSynonymBed && type === "antonym");

      await window.PaperGardenProgressStore.recordAttempt(currentWord.id, isCorrect);
      await window.PaperGardenSessionStore.recordAttemptResult(isCorrect);

      if (isCorrect) {
        element.classList.remove("bg-white", "border-border-subtle");
        element.classList.add(isSynonymBed ? "bg-primary-container" : "bg-tertiary-container", "text-white", "success-glow");
        element.setAttribute("draggable", "false");

        const targetContainer = isSynonymBed ? synonymChips : antonymChips;
        targetContainer.appendChild(element);
        remainingCorrectDrops -= 1;

        if (window.navigator.vibrate) {
          window.navigator.vibrate(20);
        }

        if (remainingCorrectDrops <= 0) {
          setTimeout(() => {
            moveNextWord().catch((error) => console.error(error));
          }, 350);
        }
      } else {
        element.classList.add("animate-bounce");
        setTimeout(() => element.classList.remove("animate-bounce"), 500);
      }
    });
  });

  async function init() {
    session = await window.PaperGardenSessionStore.ensureActiveSession();
    currentIndex = session.stageCursor.pruning || 0;

    if (currentIndex >= session.wordIds.length) {
      await window.PaperGardenSessionStore.completeActiveSession();
      window.location.href = "index.html";
      return;
    }

    currentWord = await window.PaperGardenVocabStore.getWordById(session.wordIds[currentIndex]);
    renderWord(currentWord);
    updateProgress();
  }

  window.drag = drag;
  window.renderFooter({ active: "home" });
  init().catch((error) => console.error(error));
})();
