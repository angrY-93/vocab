(function () {
  let isFlipped = false;
  const card = document.getElementById("flashcard");
  const progressBar = document.getElementById("progress-bar");
  const nextButton = document.getElementById("seed-next-btn");
  const prevButton = document.getElementById("seed-prev-btn");
  let session = null;
  let currentWord = null;
  let currentIndex = 0;

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
    const total = (session && session.wordIds && session.wordIds.length) || 0;
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

  async function init() {
    session = await window.PaperGardenSessionStore.ensureActiveSession();
    const totalWords = (session && session.wordIds && session.wordIds.length) || 0;
    currentIndex = (session && session.stageCursor && session.stageCursor.seeding) || 0;

    if (!session || totalWords === 0 || currentIndex >= totalWords) {
      window.location.href = "watering.html";
      return;
    }

    currentWord = await window.PaperGardenVocabStore.getWordById(session.wordIds[currentIndex]);
    renderWord(currentWord);
    updateProgress();
    updatePrevButtonState();
  }

  async function goNext() {
    if (nextButton.disabled) {
      return;
    }

    if (!session || !currentWord) {
      await init();
      if (!session || !currentWord) {
        return;
      }
    }

    nextButton.disabled = true;

    try {
      await window.PaperGardenProgressStore.recordAttempt(currentWord.id, true);
      await window.PaperGardenSessionStore.recordAttemptResult(true);

      currentIndex += 1;
      const updatedSession = await window.PaperGardenSessionStore.updateStageCursor("seeding", currentIndex);
      session = updatedSession || (await window.PaperGardenSessionStore.getActiveSession());

      const totalWords = (session && session.wordIds && session.wordIds.length) || 0;
      if (!session || currentIndex >= totalWords) {
        window.location.href = "watering.html";
        return;
      }

      const nextWordId = session.wordIds[currentIndex];
      currentWord = await window.PaperGardenVocabStore.getWordById(nextWordId);

      if (!currentWord) {
        window.location.href = "watering.html";
        return;
      }

      isFlipped = false;
      card.classList.remove("rotate-y-180");
      renderWord(currentWord);
      updateProgress();
      updatePrevButtonState();
    } catch (error) {
      console.error(error);
    } finally {
      nextButton.disabled = false;
    }
  }

  async function goPrev() {
    if (prevButton.disabled) {
      return;
    }

    if (!session || !currentWord) {
      return;
    }

    prevButton.disabled = true;

    try {
      currentIndex -= 1;
      if (currentIndex < 0) {
        currentIndex = 0;
        return;
      }

      const updatedSession = await window.PaperGardenSessionStore.updateStageCursor("seeding", currentIndex);
      session = updatedSession || (await window.PaperGardenSessionStore.getActiveSession());

      const prevWordId = session.wordIds[currentIndex];
      currentWord = await window.PaperGardenVocabStore.getWordById(prevWordId);

      if (!currentWord) {
        return;
      }

      isFlipped = false;
      card.classList.remove("rotate-y-180");
      renderWord(currentWord);
      updateProgress();
      updatePrevButtonState();
    } catch (error) {
      console.error(error);
    } finally {
      prevButton.disabled = false;
    }
  }

  function updatePrevButtonState() {
    if (prevButton && currentIndex <= 0) {
      prevButton.disabled = true;
    } else if (prevButton) {
      prevButton.disabled = false;
    }
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
  prevButton.addEventListener("click", goPrev);
  window.renderFooter({ active: "home" });
  init().catch((error) => console.error(error));
})();
