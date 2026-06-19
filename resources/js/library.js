(function () {
  const state = {
    words: [],
    openGroupLetter: null,
    activeWordId: null,
  };

  function getFirstLetter(word) {
    const value = String(word || "").trim();
    if (!value) {
      return "#";
    }

    const firstCharacter = value[0].toUpperCase();
    return /[A-Z]/.test(firstCharacter) ? firstCharacter : "#";
  }

  function sortWords(words) {
    return [...words].sort((left, right) => {
      const primary = left.word.localeCompare(right.word, undefined, { sensitivity: "base" });
      if (primary !== 0) {
        return primary;
      }
      return String(left.id).localeCompare(String(right.id), undefined, { sensitivity: "base" });
    });
  }

  function groupWords(words) {
    const groups = new Map();

    sortWords(words).forEach((word) => {
      const letter = getFirstLetter(word.word);
      if (!groups.has(letter)) {
        groups.set(letter, []);
      }
      groups.get(letter).push(word);
    });

    return [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right, undefined, { sensitivity: "base" }))
      .map(([letter, items]) => ({
        letter,
        items,
      }));
  }

  function getDefinitionCountLabel(word) {
    const count = Array.isArray(word.definitions) ? word.definitions.length : 0;
    return `${count} definition${count === 1 ? "" : "s"}`;
  }

  function getPartsOfSpeech(word) {
    if (!Array.isArray(word.definitions)) {
      return "";
    }

    const parts = word.definitions
      .map((definition) => definition.part_of_speech)
      .filter(Boolean)
      .filter((value, index, collection) => collection.indexOf(value) === index);

    return parts.join(" • ");
  }

  function makeChip(text) {
    const chip = document.createElement("span");
    chip.className = "library-detail-chip";
    chip.textContent = text;
    return chip;
  }

  function createSectionTitle(text) {
    const heading = document.createElement("h3");
    heading.className = "library-detail-section-title";
    heading.textContent = text;
    return heading;
  }

  function createParagraph(text, className) {
    const paragraph = document.createElement("p");
    paragraph.className = className;
    paragraph.textContent = text;
    return paragraph;
  }

  function getWordById(wordId) {
    return state.words.find((word) => word.id === wordId) || null;
  }

  function closeDetailCard() {
    const overlay = document.getElementById("library-detail-overlay");
    if (!overlay) {
      return;
    }

    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("library-detail-open");
    state.activeWordId = null;
  }

  function openDetailCard(wordId) {
    const word = getWordById(wordId);
    const overlay = document.getElementById("library-detail-overlay");
    const title = document.getElementById("library-detail-word");
    const pronunciation = document.getElementById("library-detail-pronunciation");
    const content = document.getElementById("library-detail-content");
    const closeButton = document.getElementById("library-detail-close");

    if (!word || !overlay || !title || !pronunciation || !content || !closeButton) {
      return;
    }

    title.textContent = word.word;

    if (word.pronunciation) {
      pronunciation.hidden = false;
      pronunciation.textContent = word.pronunciation;
    } else {
      pronunciation.hidden = true;
      pronunciation.textContent = "";
    }

    content.replaceChildren();

    (word.definitions || []).forEach((definition) => {
      const block = document.createElement("article");
      block.className = "library-definition-block";

      if (definition.part_of_speech) {
        const tag = document.createElement("span");
        tag.className = "library-definition-tag";
        tag.textContent = definition.part_of_speech;
        block.appendChild(tag);
      }

      if (definition.definition) {
        block.appendChild(createSectionTitle("Definition"));
        block.appendChild(createParagraph(definition.definition, "library-detail-copy"));
      }

      if (definition.example) {
        block.appendChild(createSectionTitle("Example"));
        block.appendChild(createParagraph(`“${definition.example}”`, "library-detail-example"));
      }

      if (Array.isArray(definition.sentences) && definition.sentences.length) {
        block.appendChild(createSectionTitle("Practice sentences"));
        const sentenceList = document.createElement("ul");
        sentenceList.className = "library-detail-sentence-list";
        definition.sentences.forEach((sentence) => {
          const item = document.createElement("li");
          item.textContent = sentence;
          sentenceList.appendChild(item);
        });
        block.appendChild(sentenceList);
      }

      if (Array.isArray(definition.synonyms) && definition.synonyms.length) {
        block.appendChild(createSectionTitle("Synonyms"));
        const synonyms = document.createElement("div");
        synonyms.className = "library-detail-chip-list";
        definition.synonyms.forEach((value) => synonyms.appendChild(makeChip(value)));
        block.appendChild(synonyms);
      }

      if (Array.isArray(definition.antonyms) && definition.antonyms.length) {
        block.appendChild(createSectionTitle("Antonyms"));
        const antonyms = document.createElement("div");
        antonyms.className = "library-detail-chip-list";
        definition.antonyms.forEach((value) => antonyms.appendChild(makeChip(value)));
        block.appendChild(antonyms);
      }

      content.appendChild(block);
    });

    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("library-detail-open");
    state.activeWordId = wordId;
    closeButton.focus();
  }

  function toggleGroup(letter) {
    state.openGroupLetter = state.openGroupLetter === letter ? null : letter;
    renderGroups(state.words);
  }

  function createWordItem(word) {
    const listItem = document.createElement("li");
    listItem.className = "library-word-item";

    const button = document.createElement("button");
    button.className = "library-word-button";
    button.type = "button";
    button.setAttribute("aria-label", `View details for ${word.word}`);
    button.addEventListener("click", () => {
      openDetailCard(word.id);
    });

    const row = document.createElement("div");
    row.className = "library-word-row";

    const textWrap = document.createElement("div");

    const title = document.createElement("p");
    title.className = "library-word-name";
    title.textContent = word.word;

    const meta = document.createElement("p");
    meta.className = "library-word-meta";
    const partsOfSpeech = getPartsOfSpeech(word);
    meta.textContent = partsOfSpeech || "Vocabulary entry";

    const badge = document.createElement("span");
    badge.className = "library-word-badge";
    badge.textContent = getDefinitionCountLabel(word);

    textWrap.append(title, meta);
    row.append(textWrap, badge);
    button.appendChild(row);
    listItem.appendChild(button);

    return listItem;
  }

  function createGroupSection(group) {
    const section = document.createElement("section");
    section.className = "library-group";

    const header = document.createElement("button");
    header.className = "library-group-header";
    header.type = "button";
    header.setAttribute("aria-expanded", state.openGroupLetter === group.letter ? "true" : "false");
    header.setAttribute("aria-controls", `library-group-panel-${group.letter}`);
    header.addEventListener("click", () => {
      toggleGroup(group.letter);
    });

    const titleWrap = document.createElement("div");
    titleWrap.className = "library-group-title";

    const letterBadge = document.createElement("span");
    letterBadge.className = "library-group-letter";
    letterBadge.textContent = group.letter;

    const title = document.createElement("p");
    title.className = "library-group-name";
    title.textContent = group.letter;

    const count = document.createElement("span");
    count.className = "library-group-count";
    count.textContent = `${group.items.length} word${group.items.length === 1 ? "" : "s"}`;

    const metaWrap = document.createElement("div");
    metaWrap.className = "library-group-meta";

    const chevron = document.createElement("span");
    chevron.className = "material-symbols-outlined library-group-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "expand_more";

    titleWrap.append(letterBadge, title);
    metaWrap.append(count, chevron);
    header.append(titleWrap, metaWrap);

    const list = document.createElement("ul");
    list.className = "library-word-list";
    list.id = `library-group-panel-${group.letter}`;
    list.classList.add("library-group-panel");
    list.hidden = state.openGroupLetter !== group.letter;
    group.items.forEach((word) => {
      list.appendChild(createWordItem(word));
    });

    section.append(header, list);
    return section;
  }

  function setLoadingState(isLoading) {
    const loading = document.getElementById("library-loading-state");
    if (loading) {
      loading.hidden = !isLoading;
    }
  }

  function renderGroups(words) {
    const totalCount = document.getElementById("library-total-count");
    const groupsRoot = document.getElementById("library-groups");
    const emptyState = document.getElementById("library-empty-state");

    if (!groupsRoot || !totalCount || !emptyState) {
      return;
    }

    state.words = words;
    totalCount.textContent = String(words.length);
    groupsRoot.replaceChildren();

    if (!words.length) {
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    groupWords(words).forEach((group) => {
      groupsRoot.appendChild(createGroupSection(group));
    });
  }

  function renderError() {
    const emptyState = document.getElementById("library-empty-state");
    const totalCount = document.getElementById("library-total-count");
    if (emptyState) {
      emptyState.hidden = false;
      emptyState.textContent = "Unable to load vocabulary right now.";
    }
    if (totalCount) {
      totalCount.textContent = "0";
    }
  }

  async function init() {
    setLoadingState(true);

    try {
      const words = await window.PaperGardenVocabStore.loadWords();
      renderGroups(words);
    } catch (error) {
      console.error(error);
      renderError();
    } finally {
      setLoadingState(false);
    }
  }

  document.addEventListener("click", (event) => {
    const closeTrigger = event.target.closest("[data-close-detail='true']");
    if (closeTrigger) {
      closeDetailCard();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.activeWordId) {
      closeDetailCard();
    }
  });

  const detailCloseButton = document.getElementById("library-detail-close");
  if (detailCloseButton) {
    detailCloseButton.addEventListener("click", closeDetailCard);
  }

  init();
})();
