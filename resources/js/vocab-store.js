(function () {
  const DATA_URL = "resources/data/vocab-v1.json";
  let cachedWords = null;

  async function loadWords() {
    if (cachedWords) {
      return cachedWords;
    }

    const response = await fetch(DATA_URL, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Unable to load vocabulary data: ${response.status}`);
    }

    const words = await response.json();
    cachedWords = Array.isArray(words) ? words : [];
    return cachedWords;
  }

  async function getWordById(wordId) {
    const words = await loadWords();
    return words.find((word) => word.id === wordId) || null;
  }

  function pickRandomItems(items, count) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled.slice(0, Math.max(0, count));
  }

  window.PaperGardenVocabStore = {
    loadWords,
    getWordById,
    pickRandomItems,
  };
})();
