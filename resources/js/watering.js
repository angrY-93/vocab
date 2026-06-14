(function () {
  let session = null;
  let currentWord = null;
  let currentIndex = 0;

  function updateProgress() {
    const total = session.wordIds.length;
    const completion = Math.min(100, Math.round((currentIndex / Math.max(1, total)) * 100));
    document.getElementById("progress-bar").style.width = `${completion}%`;
  }

  function shuffle(items) {
    const cloned = [...items];
    for (let index = cloned.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [cloned[index], cloned[randomIndex]] = [cloned[randomIndex], cloned[index]];
    }
    return cloned;
  }

  function buildDistractors(word) {
    const antonyms = (word.antonyms || []).slice(0, 2);
    const synonyms = (word.synonyms || []).slice(0, 1);
    const distractors = [...antonyms, ...synonyms].filter((candidate) => {
      return candidate.toLowerCase() !== (word.word || "").toLowerCase();
    });

    while (distractors.length < 3) {
      distractors.push(`not-${distractors.length + 1}`);
    }

    return distractors.slice(0, 3);
  }

  function renderOptions(word) {
    const bank = document.getElementById("word-bank");
    bank.innerHTML = "";

    const correct = (word.synonyms && word.synonyms[0]) || word.word;
    const options = shuffle([correct, ...buildDistractors(word)]);

    options.forEach((option) => {
      const button = document.createElement("button");
      button.className = "word-option h-14 bg-surface-white border-2 border-border-subtle rounded-full font-button-text text-button-text text-on-surface hover:border-outline-variant active:scale-95 transition-all";
      button.textContent = option;
      button.addEventListener("click", () => checkAnswer(button, option, correct));
      bank.appendChild(button);
    });
  }

  async function checkAnswer(btn, selectedWord, correctAnswer) {
    const gap = document.getElementById("sentence-gap");
    const animation = document.getElementById("watering-animation");
    const drawer = document.getElementById("success-drawer");
    const isCorrect = selectedWord === correctAnswer;

    await window.PaperGardenProgressStore.recordAttempt(currentWord.id, isCorrect);
    await window.PaperGardenSessionStore.recordAttemptResult(isCorrect);

    if (isCorrect) {
      btn.classList.remove("bg-surface-white", "text-on-surface");
      btn.classList.add("bg-primary-container", "text-on-primary-container", "border-primary", "success-glow");

      gap.innerText = selectedWord;
      gap.classList.remove("text-primary-container");
      gap.classList.add("text-primary", "font-bold");

      if (animation) {
        animation.classList.remove("hidden");
      }

      document.querySelectorAll(".word-option").forEach((button) => {
        button.disabled = true;
      });

      setTimeout(async () => {
        drawer.classList.remove("translate-y-full");
        currentIndex += 1;
        await window.PaperGardenSessionStore.updateStageCursor("watering", currentIndex);
        updateProgress();
      }, 500);
    } else {
      btn.classList.add("shake", "bg-error-soft", "border-error", "text-error-text");
      setTimeout(() => {
        btn.classList.remove("shake", "bg-error-soft", "border-error", "text-error-text");
      }, 1000);
      document.getElementById("feedback-hint").classList.remove("opacity-0");
    }
  }

  async function resetPage() {
    const total = session.wordIds.length;
    if (currentIndex >= total) {
      window.location.href = "pruning.html";
      return;
    }

    currentWord = await window.PaperGardenVocabStore.getWordById(session.wordIds[currentIndex]);
    const promptWord = (currentWord.antonyms && currentWord.antonyms[0]) || "careful";
    document.getElementById("sentence-gap").textContent = "___";
    document.getElementById("sentence-gap").className = "inline-block border-b-2 border-primary min-w-[100px] text-primary-container transition-all duration-300 mx-1";
    document.getElementById("sentence-template").innerHTML = `The <span class=\"inline-block border-b-2 border-primary min-w-[100px] text-primary-container transition-all duration-300 mx-1\" id=\"sentence-gap\">___</span> gardener carefully tended to each flower while avoiding being ${promptWord}.`;
    document.getElementById("success-drawer").classList.add("translate-y-full");
    renderOptions(currentWord);
  }

  async function init() {
    session = await window.PaperGardenSessionStore.ensureActiveSession();
    currentIndex = session.stageCursor.watering || 0;

    if (currentIndex >= session.wordIds.length) {
      window.location.href = "pruning.html";
      return;
    }

    currentWord = await window.PaperGardenVocabStore.getWordById(session.wordIds[currentIndex]);
    renderOptions(currentWord);
    updateProgress();

    setTimeout(() => {
      document.getElementById("feedback-hint").classList.remove("opacity-0");
    }, 1000);
  }

  window.resetPage = resetPage;
  window.renderFooter({ active: "home" });
  init().catch((error) => console.error(error));
})();
