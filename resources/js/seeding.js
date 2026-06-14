(function () {
  let isFlipped = false;
  const card = document.getElementById("flashcard");
  const progressBar = document.getElementById("progress-bar");
  const nextButton = document.getElementById("seed-next-btn");
  let session = null;
  let currentWord = null;

  function flipCard() {
    isFlipped = !isFlipped;
    if (isFlipped) {
      card.classList.add("rotate-y-180");
    } else {
      card.classList.remove("rotate-y-180");
    }
  }

  function renderChips(containerId, items) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    items.forEach((item) => {
      const chip = document.createElement("span");
      chip.className = "px-3 py-1 bg-surface-container-low border border-border-subtle rounded-full text-on-surface-variant text-sm";
      chip.textContent = item;
      container.appendChild(chip);
    });
  }

  function updateProgress() {
    const total = session.wordIds.length;
    const currentIndex = session.stageCursor.seeding || 0;
    const completion = Math.min(100, Math.round((currentIndex / Math.max(1, total)) * 100));
    progressBar.style.width = `${completion}%`;
  }

  function renderWord(word) {
    if (!word) {
      window.location.href = "watering.html";
      return;
    }

    document.getElementById("seed-word").textContent = word.word;
    document.getElementById("seed-pronunciation").textContent = word.pronunciation || "";
    document.getElementById("seed-definition").textContent = word.definition;
    document.getElementById("seed-example").textContent = `"${word.example}"`;
    renderChips("seed-synonyms", word.synonyms || []);
  }

  async function goNext() {
    if (!currentWord || !session) {
      return;
    }

    nextButton.disabled = true;
    await window.PaperGardenProgressStore.recordAttempt(currentWord.id, true);
    await window.PaperGardenSessionStore.recordAttemptResult(true);

    const nextIndex = (session.stageCursor.seeding || 0) + 1;
    await window.PaperGardenSessionStore.updateStageCursor("seeding", nextIndex);
    session = await window.PaperGardenSessionStore.getActiveSession();

    if (!session || nextIndex >= session.wordIds.length) {
      window.location.href = "watering.html";
      return;
    }

    currentWord = await window.PaperGardenVocabStore.getWordById(session.wordIds[nextIndex]);
    isFlipped = false;
    card.classList.remove("rotate-y-180");
    renderWord(currentWord);
    updateProgress();
    nextButton.disabled = false;
  }

  async function init() {
    session = await window.PaperGardenSessionStore.ensureActiveSession();
    const index = session.stageCursor.seeding || 0;
    currentWord = await window.PaperGardenVocabStore.getWordById(session.wordIds[index]);
    renderWord(currentWord);
    updateProgress();
  }

  window.flipCard = flipCard;

  document.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("mousedown", () => {
      btn.style.transform = "scale(0.96)";
    });
    btn.addEventListener("mouseup", () => {
      btn.style.transform = "";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "";
    });
  });

  document.addEventListener("mousemove", (e) => {
    const x = (window.innerWidth / 2 - e.pageX) / 50;
    const y = (window.innerHeight / 2 - e.pageY) / 50;
    const illustrations = document.querySelectorAll("img[data-alt]");
    illustrations.forEach((img) => {
      img.style.transform = `translate(${x}px, ${y}px)`;
    });
  });

  nextButton.addEventListener("click", goNext);
  window.renderFooter({ active: "home" });
  init().catch((error) => console.error(error));
})();
