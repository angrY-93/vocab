(function () {
  let session = null;
  let currentWord = null;
  let currentIndex = 0;
  const progressBarElement = document.getElementById("progress-bar");
  let wateringWordIds = null;
  const defaultFeedbackText = "Tap the word that completes the garden!";

  function updateProgress() {
    const total = wateringWordIds.length;
    const completion = Math.min(100, Math.round((currentIndex / Math.max(1, total)) * 100));
    progressBarElement.style.width = `${completion}%`;
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

  function getRandomSentence(word) {
    if (!word.sentences || word.sentences.length === 0) {
      return `The ____ gardener carefully tended to each flower.`;
    }
    const randomIdx = Math.floor(Math.random() * word.sentences.length);
    return word.sentences[randomIdx];
  }

  function normalizeOptionValue(value) {
    return String(value || "").trim().toLowerCase();
  }

  function formatOptionLabel(value) {
    return normalizeOptionValue(value);
  }

  function setFeedbackHint(message = defaultFeedbackText, isVisible = true) {
    const hint = document.getElementById("feedback-hint");
    if (!hint) {
      return;
    }

    const text = hint.querySelector("p");
    if (text) {
      text.textContent = message;
    }

    hint.classList.toggle("opacity-0", !isVisible);
  }

  function renderOptions(word) {
    const bank = document.getElementById("word-bank");
    bank.innerHTML = "";

    const correct = word.word;
    const options = shuffle([correct, ...buildDistractors(word)]).map((value) => ({
      value,
      normalized: normalizeOptionValue(value),
    }));

    options.forEach((option) => {
      const button = document.createElement("button");
      button.className = "word-option h-14 bg-surface-white border-2 border-border-subtle rounded-full font-button-text text-button-text text-on-surface hover:border-outline-variant active:scale-95 transition-all";
      button.textContent = formatOptionLabel(option.value);
      button.addEventListener("click", () => checkAnswer(button, option.normalized, normalizeOptionValue(correct)));
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

      gap.innerText = formatOptionLabel(correctAnswer);
      gap.classList.remove("text-primary-container");
      gap.classList.add("text-primary", "font-bold");
      setFeedbackHint(defaultFeedbackText, false);

      if (animation) {
        animation.classList.remove("hidden");
      }

      document.querySelectorAll(".word-option").forEach((button) => {
        button.disabled = true;
      });

      setTimeout(async () => {
        drawer.classList.add("is-open");
        currentIndex += 1;
        await window.PaperGardenSessionStore.updateStageCursor("watering", currentIndex);
        updateProgress();
      }, 500);
    } else {
      btn.classList.remove("bg-surface-white", "text-on-surface", "border-border-subtle");
      btn.classList.add("bg-error-soft", "border-error", "text-error-text");
      setTimeout(() => {
        btn.classList.add("bg-surface-white", "text-on-surface", "border-border-subtle");
        btn.classList.remove("bg-error-soft", "border-error", "text-error-text");
      }, 1000);
      setFeedbackHint("Not quite — try another word.", true);
    }
  }

  async function resetPage() {
    const total = wateringWordIds.length;
    if (currentIndex >= total) {
      window.location.href = "pruning.html";
      return;
    }

    currentWord = await window.PaperGardenVocabStore.getWordById(wateringWordIds[currentIndex]);
    const sentence = getRandomSentence(currentWord);
    document.getElementById("sentence-gap").textContent = "___";
    document.getElementById("sentence-gap").className = "inline-block border-b-2 border-primary min-w-[100px] text-primary-container transition-all duration-300 mx-1";
    document.getElementById("sentence-template").innerHTML = sentence.replace("____", "<span class=\"inline-block border-b-2 border-primary min-w-[100px] text-primary-container transition-all duration-300 mx-1\" id=\"sentence-gap\">___</span>");
    document.getElementById("success-drawer").classList.remove("is-open");
    setFeedbackHint(defaultFeedbackText, true);
    renderOptions(currentWord);
  }

  if (progressBarElement) {
    progressBarElement.style.width = "0%";
  }

  async function init() {
    session = await window.PaperGardenSessionStore.ensureActiveSession();
    currentIndex = session.stageCursor.watering || 0;

    if (currentIndex >= session.wordIds.length) {
      window.location.href = "pruning.html";
      return;
    }

    if (!session.wateringWordIds) {
      wateringWordIds = shuffle(session.wordIds);
      await window.PaperGardenSessionStore.updateWateringOrder(wateringWordIds);
    } else {
      wateringWordIds = session.wateringWordIds;
    }

    currentWord = await window.PaperGardenVocabStore.getWordById(wateringWordIds[currentIndex]);
    const sentence = getRandomSentence(currentWord);
    document.getElementById("sentence-template").innerHTML = sentence.replace("____", "<span class=\"inline-block border-b-2 border-primary min-w-[100px] text-primary-container transition-all duration-300 mx-1\" id=\"sentence-gap\">___</span>");
    renderOptions(currentWord);
    updateProgress();
    setFeedbackHint(defaultFeedbackText, false);

    setTimeout(() => {
      setFeedbackHint(defaultFeedbackText, true);
    }, 1000);
  }

  window.resetPage = resetPage;
  window.renderFooter({ active: "home" });
  init().catch((error) => console.error(error));
})();
