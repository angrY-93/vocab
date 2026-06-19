(function () {
  const synonymBed = document.getElementById("synonyms-bed");
  const antonymBed = document.getElementById("antonyms-bed");
  const synonymChips = document.getElementById("synonym-chips");
  const antonymChips = document.getElementById("antonym-chips");
  const wordBank = document.getElementById("word-bank");
  const progressBar = document.getElementById("progress-bar");
  const checkBtn = document.getElementById("check-btn");
  const continueBtn = document.getElementById("continue-btn");

  let session = null;
  let currentWord = null;
  let currentIndex = 0;
  let hasCheckedCurrentPlacement = false;
  let hasCheckedCurrentWord = false;
  let evaluatedArrangements = new Set();
  let initialChipOrder = [];

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

  function clearChipMarker(chip) {
    const marker = chip.querySelector(".result-marker");
    if (marker) {
      marker.remove();
    }
  }

  function setChipMarker(chip, isCorrect) {
    clearChipMarker(chip);
    const marker = document.createElement("span");
    marker.className = "result-marker material-symbols-outlined";
    marker.textContent = isCorrect ? "check_circle" : "cancel";
    marker.classList.add(isCorrect ? "marker-correct" : "marker-wrong");
    chip.appendChild(marker);
  }

  function resetChipFeedback() {
    document.querySelectorAll(".word-chip").forEach((chip) => {
      chip.classList.remove("border-primary", "border-error");
      chip.classList.add("border-border-subtle");
      clearChipMarker(chip);
    });
  }

  function serializeContainer(container) {
    return Array.from(container.children)
      .map((chip) => `${chip.textContent}:${chip.getAttribute("data-type")}`)
      .sort()
      .join("|");
  }

  function getArrangementSignature() {
    return [
      `syn:${serializeContainer(synonymChips)}`,
      `ant:${serializeContainer(antonymChips)}`,
      `bank:${serializeContainer(wordBank)}`,
    ].join("::");
  }

  function syncActionButtons() {
    const allPlaced = areAllChipsPlaced();
    checkBtn.disabled = !allPlaced;
    continueBtn.classList.toggle("hidden", !hasCheckedCurrentWord);
    continueBtn.disabled = !hasCheckedCurrentWord;

    if (!hasCheckedCurrentWord) {
      continueBtn.textContent = "Continue";
      return;
    }

    continueBtn.textContent = hasCheckedCurrentPlacement ? "Continue" : "Retry";
  }

  function markArrangementDirty() {
    hasCheckedCurrentPlacement = false;
    resetChipFeedback();
    syncActionButtons();
  }

  function restoreInitialPlacement() {
    synonymChips.innerHTML = "";
    antonymChips.innerHTML = "";
    wordBank.innerHTML = "";

    initialChipOrder.forEach((chipData, index) => {
      const chip = makeWordChip(chipData.label, chipData.type, index);
      wordBank.appendChild(chip);
    });

    markArrangementDirty();
  }

  function renderWord(word) {
    document.getElementById("pruning-word").textContent = word.word;
    synonymChips.innerHTML = "";
    antonymChips.innerHTML = "";
    wordBank.innerHTML = "";

    const allSynonyms = [...new Set((word.definitions || []).flatMap((d) => d.synonyms || []))];
    const allAntonyms = [...new Set((word.definitions || []).flatMap((d) => d.antonyms || []))];
    const synonymItems = allSynonyms.map((label) => ({ label, type: "synonym" }));
    const antonymItems = allAntonyms.map((label) => ({ label, type: "antonym" }));
    const chips = shuffle([...synonymItems, ...antonymItems]);
    initialChipOrder = chips.map((chipData) => ({ ...chipData }));

    chips.forEach((chipData, index) => {
      const chip = makeWordChip(chipData.label, chipData.type, index);
      wordBank.appendChild(chip);
    });

    hasCheckedCurrentPlacement = false;
    hasCheckedCurrentWord = false;
    evaluatedArrangements = new Set();
    resetChipFeedback();
    continueBtn.classList.add("hidden");
    syncActionButtons();
  }

  function areAllChipsPlaced() {
    return wordBank.children.length === 0;
  }

  function checkAllAnswers() {
    const synonymChipsList = Array.from(synonymChips.children);
    const antonymChipsList = Array.from(antonymChips.children);

    let isCorrect = true;
    resetChipFeedback();

    synonymChipsList.forEach((chip) => {
      const chipType = chip.getAttribute("data-type");
      if (chipType === "synonym") {
        chip.classList.remove("border-border-subtle");
        chip.classList.add("border-primary");
        setChipMarker(chip, true);
      } else {
        chip.classList.remove("border-border-subtle");
        chip.classList.add("border-error");
        setChipMarker(chip, false);
        isCorrect = false;
      }
    });

    antonymChipsList.forEach((chip) => {
      const chipType = chip.getAttribute("data-type");
      if (chipType === "antonym") {
        chip.classList.remove("border-border-subtle");
        chip.classList.add("border-primary");
        setChipMarker(chip, true);
      } else {
        chip.classList.remove("border-border-subtle");
        chip.classList.add("border-error");
        setChipMarker(chip, false);
        isCorrect = false;
      }
    });

    hasCheckedCurrentPlacement = isCorrect;
    hasCheckedCurrentWord = true;
    syncActionButtons();

    return { isCorrect };
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

  function setupDropZoneListeners() {
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
        if (!element) {
          return;
        }

        const isSynonymBed = bed.id === "synonyms-bed";
        const targetContainer = isSynonymBed ? synonymChips : antonymChips;

        // Allow moving from word bank or from other beds
        if (element.parentElement === wordBank || element.parentElement === synonymChips || element.parentElement === antonymChips) {
          targetContainer.appendChild(element);
          markArrangementDirty();

          if (window.navigator.vibrate) {
            window.navigator.vibrate(20);
          }
        }
      });
    });

    // Also allow dragging back to word bank
    wordBank.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    wordBank.addEventListener("drop", (event) => {
      event.preventDefault();

      const id = event.dataTransfer.getData("text");
      const element = document.getElementById(id);
      if (!element) {
        return;
      }

      if (element.parentElement === synonymChips || element.parentElement === antonymChips) {
        wordBank.appendChild(element);
        markArrangementDirty();

        if (window.navigator.vibrate) {
          window.navigator.vibrate(20);
        }
      }
    });
  }

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
    setupDropZoneListeners();
  }

  checkBtn.addEventListener("click", async () => {
    if (!areAllChipsPlaced()) {
      return;
    }

    const arrangementSignature = getArrangementSignature();
    const { isCorrect } = checkAllAnswers();

    if (!evaluatedArrangements.has(arrangementSignature)) {
      evaluatedArrangements.add(arrangementSignature);
      await window.PaperGardenProgressStore.recordAttempt(currentWord.id, isCorrect);
      await window.PaperGardenSessionStore.recordAttemptResult(isCorrect);
    }

    syncActionButtons();
  });

  continueBtn.addEventListener("click", () => {
    if (!hasCheckedCurrentPlacement) {
      restoreInitialPlacement();
      return;
    }

    moveNextWord().catch((error) => console.error(error));
  });

  window.drag = drag;
  window.renderFooter({ active: "home" });
  init().catch((error) => console.error(error));
})();
