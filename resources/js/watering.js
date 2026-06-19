(function () {
  let session = null;
  let currentWord = null;
  let currentIndex = 0;
  let allWords = null;
  let selectedDef = null;
  let correctToken = null;
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

  function extractBracketedToken(sentence) {
    const match = sentence.match(/\[([^\]]+)\]/);
    return match ? match[1] : null;
  }

  /** Pick a random definition, then a random sentence that contains a bracketed token. */
  function sampleQuiz(word) {
    const defs = word.definitions || [];
    if (defs.length === 0) return { def: null, sentence: null, token: null };

    // Shuffle definitions so the sampling is fair across POS
    const shuffledDefs = shuffle(defs);
    for (const def of shuffledDefs) {
      const validSentences = (def.sentences || []).filter((s) => extractBracketedToken(s));
      if (validSentences.length === 0) continue;
      const sentence = validSentences[Math.floor(Math.random() * validSentences.length)];
      return { def, sentence, token: extractBracketedToken(sentence) };
    }
    return { def: null, sentence: null, token: null };
  }

  /** Build 3 distractor tokens from other words that share the same part of speech. */
  function buildDistractors(pos, correct) {
    const candidates = shuffle(
      (allWords || []).filter(
        (w) =>
          w.id !== currentWord.id &&
          w.definitions &&
          w.definitions.some((d) => d.part_of_speech === pos)
      )
    );

    const tokens = [];
    for (const word of candidates) {
      if (tokens.length >= 3) break;
      const posDefs = word.definitions.filter((d) => d.part_of_speech === pos);
      const def = posDefs[Math.floor(Math.random() * posDefs.length)];
      const validSentences = (def.sentences || []).filter((s) => extractBracketedToken(s));
      if (validSentences.length === 0) continue;
      const sentence = validSentences[Math.floor(Math.random() * validSentences.length)];
      const token = extractBracketedToken(sentence);
      if (token && token !== correct && !tokens.includes(token)) {
        tokens.push(token);
      }
    }

    // Pad with placeholders if the word list is small
    let pad = 1;
    while (tokens.length < 3) {
      tokens.push(`word-${pad++}`);
    }
    return tokens.slice(0, 3);
  }

  function setFeedbackHint(message = defaultFeedbackText, isVisible = true) {
    const hint = document.getElementById("feedback-hint");
    if (!hint) return;
    const text = hint.querySelector("p");
    if (text) text.textContent = message;
    hint.classList.toggle("opacity-0", !isVisible);
  }

  function renderOptions() {
    const bank = document.getElementById("word-bank");
    bank.innerHTML = "";

    const distractors = buildDistractors(selectedDef ? selectedDef.part_of_speech : null, correctToken);
    const options = shuffle([correctToken, ...distractors]);

    options.forEach((value) => {
      const button = document.createElement("button");
      button.className =
        "word-option h-14 bg-surface-white border-2 border-border-subtle rounded-full font-button-text text-button-text text-on-surface hover:border-outline-variant active:scale-95 transition-all";
      button.textContent = value;
      button.addEventListener("click", () => checkAnswer(button, value, correctToken));
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

      gap.innerText = correctAnswer;
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

  function buildSentenceHTML(sentence) {
    return sentence.replace(
      /\[[^\]]+\]/,
      '<span class="inline-block border-b-2 border-primary min-w-[100px] text-primary-container transition-all duration-300 mx-1" id="sentence-gap">___</span>'
    );
  }

  async function resetPage() {
    const total = wateringWordIds.length;
    if (currentIndex >= total) {
      window.location.href = "pruning.html";
      return;
    }

    currentWord = await window.PaperGardenVocabStore.getWordById(wateringWordIds[currentIndex]);
    const quiz = sampleQuiz(currentWord);
    selectedDef = quiz.def;
    correctToken = quiz.token;

    document.getElementById("sentence-template").innerHTML = buildSentenceHTML(quiz.sentence);
    document.getElementById("success-drawer").classList.remove("is-open");
    setFeedbackHint(defaultFeedbackText, true);
    renderOptions();
  }

  if (progressBarElement) {
    progressBarElement.style.width = "0%";
  }

  async function init() {
    session = await window.PaperGardenSessionStore.ensureActiveSession();
    allWords = await window.PaperGardenVocabStore.loadWords();
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
    const quiz = sampleQuiz(currentWord);
    selectedDef = quiz.def;
    correctToken = quiz.token;

    document.getElementById("sentence-template").innerHTML = buildSentenceHTML(quiz.sentence);
    renderOptions();
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
