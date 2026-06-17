(function () {
  const STAGES = ["seeding", "watering", "pruning"];

  function setVisibility(element, isVisible, displayMode) {
    if (!element) {
      return;
    }
    element.style.display = isVisible ? displayMode : "none";
  }

  function getStageElements() {
    return {
      seeding: {
        active: document.getElementById("home-stage-seeding-active"),
        check: document.getElementById("home-stage-seeding-check"),
      },
      watering: {
        active: document.getElementById("home-stage-watering-active"),
        check: document.getElementById("home-stage-watering-check"),
      },
      pruning: {
        active: document.getElementById("home-stage-pruning-active"),
        check: document.getElementById("home-stage-pruning-check"),
      },
    };
  }

  function clearHomeStageIndicators(stageElements) {
    STAGES.forEach((stageName) => {
      setVisibility(stageElements[stageName].active, false, "inline-block");
      setVisibility(stageElements[stageName].check, false, "grid");
    });
  }

  function buildCursorMap(session) {
    const stageCursor = session && session.stageCursor ? session.stageCursor : {};
    return {
      seeding: Number(stageCursor.seeding || 0),
      watering: Number(stageCursor.watering || 0),
      pruning: Number(stageCursor.pruning || 0),
    };
  }

  function renderHomeStageIndicators(session) {
    const stageElements = getStageElements();
    clearHomeStageIndicators(stageElements);

    if (!session || !Array.isArray(session.wordIds) || session.wordIds.length === 0) {
      return;
    }

    const totalWords = session.wordIds.length;
    const cursors = buildCursorMap(session);
    const allZero = STAGES.every((stageName) => cursors[stageName] <= 0);

    if (allZero) {
      return;
    }

    const completed = {
      seeding: cursors.seeding >= totalWords,
      watering: cursors.watering >= totalWords,
      pruning: cursors.pruning >= totalWords,
    };

    STAGES.forEach((stageName) => {
      setVisibility(stageElements[stageName].check, completed[stageName], "grid");
    });

    STAGES.forEach((stageName) => {
      const isActive = cursors[stageName] > 0 && !completed[stageName];
      setVisibility(stageElements[stageName].active, isActive, "inline-block");
    });
  }

  async function refreshHomeStageState() {
    let session = await window.PaperGardenSessionStore.getActiveSession();
    if (!session) {
      session = await window.PaperGardenSessionStore.getLatestCompletedSession();
    }
    renderHomeStageIndicators(session);
  }

  async function startNewPlant() {
    const startButton = document.getElementById("start-new-plant-btn");
    if (!startButton) {
      return;
    }

    startButton.disabled = true;
    try {
      await window.PaperGardenSessionStore.startNewSession({
        batchSize: 10,
        newTarget: 5,
      });
      renderHomeStageIndicators(null);
      window.location.href = "seeding.html";
    } catch (error) {
      startButton.disabled = false;
      console.error(error);
    }
  }

  function init() {
    window.renderFooter({ active: "home" });

    const startButton = document.getElementById("start-new-plant-btn");
    if (startButton) {
      startButton.addEventListener("click", startNewPlant);
    }

    refreshHomeStageState().catch((error) => {
      console.error(error);
    });
  }

  init();
})();
