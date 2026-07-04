(function () {
  const DATA_URL = "resources/data/vocab-v2.jsonl";
  let cachedWords = null;

  function normalizeDefinition(definition) {
    if (!definition || typeof definition !== "object") {
      return {
        part_of_speech: "",
        definition: "",
        example: "",
        sentences: [],
        synonyms: [],
        antonyms: [],
      };
    }

    return {
      ...definition,
      example: definition.example || definition.example_sentence || "",
      sentences: Array.isArray(definition.sentences)
        ? definition.sentences
        : Array.isArray(definition.practice_sentences)
          ? definition.practice_sentences
          : [],
      synonyms: Array.isArray(definition.synonyms) ? definition.synonyms : [],
      antonyms: Array.isArray(definition.antonyms) ? definition.antonyms : [],
    };
  }

  function normalizeWord(record) {
    return {
      ...record,
      definitions: Array.isArray(record.definitions)
        ? record.definitions.map(normalizeDefinition)
        : [],
    };
  }

  async function loadWords() {
    if (cachedWords) {
      return cachedWords;
    }

    const response = await fetch(DATA_URL, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Unable to load vocabulary data: ${response.status}`);
    }

    const text = await response.text();
    const words = text
      .trim()
      .split("\n")
      .filter((line) => line.trim())
      .map((line, index) => {
        try {
          return JSON.parse(line);
        } catch (e) {
          throw new Error(`vocab-v2.jsonl: invalid JSON on line ${index + 1}: ${e.message}`);
        }
      })
      .filter((record) => {
        if (!record.id || !record.word || !Array.isArray(record.definitions)) {
          console.warn(`vocab-v2.jsonl: skipping record missing id/word/definitions`, record);
          return false;
        }
        return true;
      })
      .map(normalizeWord);

    cachedWords = words;
    return cachedWords;
  }

  async function getWordById(wordId) {
    const words = await loadWords();
    return words.find((word) => word.id === wordId) || null;
  }

  async function getWordsByPos(pos) {
    const words = await loadWords();
    return words.filter(
      (word) => word.definitions && word.definitions.some((def) => def.part_of_speech === pos)
    );
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
    getWordsByPos,
    pickRandomItems,
  };
})();
