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

  function makeChip(text) {
    const chip = document.createElement("span");
    chip.className = "px-3 py-1 bg-surface-container-low border border-border-subtle rounded-full text-on-surface-variant text-sm";
    chip.textContent = text;
    return chip;
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

    const container = document.getElementById("seed-definitions");
    container.innerHTML = "";

    (word.definitions || []).forEach((def) => {
      const wrapper = document.createElement("div");
      wrapper.className = "space-y-4 pb-4 border-b border-border-subtle last:border-0 last:pb-0";

      // Part-of-speech badge + definition
      const defSection = document.createElement("section");
      const posTag = document.createElement("span");
      posTag.className = "inline-block px-2 py-0.5 bg-primary-container/20 text-primary text-xs font-label-md rounded uppercase tracking-wider mb-1";
      posTag.textContent = def.part_of_speech;
      const defHeading = document.createElement("h3");
      defHeading.className = "text-primary font-label-md uppercase tracking-wider mb-2 mt-1";
      defHeading.textContent = "Definition";
      const defText = document.createElement("p");
      defText.className = "text-on-surface text-lg leading-relaxed";
      defText.textContent = def.definition;
      defSection.appendChild(posTag);
      defSection.appendChild(defHeading);
      defSection.appendChild(defText);

      // Synonyms
      const synSection = document.createElement("section");
      const synHeading = document.createElement("h3");
      synHeading.className = "text-primary font-label-md uppercase tracking-wider mb-2";
      synHeading.textContent = "Synonyms";
      const synChips = document.createElement("div");
      synChips.className = "flex flex-wrap gap-2";
      (def.synonyms || []).forEach((s) => synChips.appendChild(makeChip(s)));
      synSection.appendChild(synHeading);
      synSection.appendChild(synChips);

      // Example
      const exSection = document.createElement("section");
      const exHeading = document.createElement("h3");
      exHeading.className = "text-primary font-label-md uppercase tracking-wider mb-2";
      exHeading.textContent = "Example";
      const exBox = document.createElement("div");
      exBox.className = "p-4 bg-background-off-white rounded-lg border-l-4 border-primary";
      const exText = document.createElement("p");
      exText.className = "text-on-surface-variant italic leading-relaxed";
      exText.textContent = `"${def.example}"`;
      exBox.appendChild(exText);
      exSection.appendChild(exHeading);
      exSection.appendChild(exBox);

      wrapper.appendChild(defSection);
      wrapper.appendChild(synSection);
      wrapper.appendChild(exSection);
      container.appendChild(wrapper);
    });
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
