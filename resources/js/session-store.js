(function () {
  const DB_NAME = "paper-garden-db";
  const DB_VERSION = 2;
  const SESSION_STORE = "sessions";
  const PROGRESS_STORE = "progress";
  const ACTIVE_SESSION_KEY = "paper-garden-active-session-id";

  let dbPromise = null;

  function ensureStores(db) {
    if (!db.objectStoreNames.contains(SESSION_STORE)) {
      db.createObjectStore(SESSION_STORE, { keyPath: "sessionId" });
    }

    if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
      const progressStore = db.createObjectStore(PROGRESS_STORE, { keyPath: "wordId" });
      progressStore.createIndex("status", "status", { unique: false });
      progressStore.createIndex("nextReviewAt", "nextReviewAt", { unique: false });
    }
  }

  function openDatabase() {
    if (dbPromise) {
      return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        ensureStores(db);
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return dbPromise;
  }

  async function readSession(sessionId) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSION_STORE, "readonly");
      const request = tx.objectStore(SESSION_STORE).get(sessionId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async function writeSession(session) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSION_STORE, "readwrite");
      tx.objectStore(SESSION_STORE).put(session);

      tx.oncomplete = () => resolve(session);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function readAllSessions() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSION_STORE, "readonly");
      const request = tx.objectStore(SESSION_STORE).getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  function randomId() {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function pickFromPool(pool, count, usedSet) {
    const available = pool.filter((item) => !usedSet.has(item.id));
    const picked = window.PaperGardenVocabStore.pickRandomItems(available, count);
    picked.forEach((item) => usedSet.add(item.id));
    return picked;
  }

  function pickWeightedFromPool(pool, count, usedSet, getWeight) {
    const available = pool.filter((item) => !usedSet.has(item.id));
    const picked = [];

    while (picked.length < count && available.length > 0) {
      let totalWeight = 0;
      const weighted = available.map((item) => {
        const rawWeight = getWeight(item);
        const weight = Number.isFinite(rawWeight) && rawWeight > 0 ? rawWeight : 1;
        totalWeight += weight;
        return { item, weight };
      });

      const threshold = Math.random() * totalWeight;
      let accumulator = 0;
      let selectedIndex = weighted.length - 1;

      for (let index = 0; index < weighted.length; index += 1) {
        accumulator += weighted[index].weight;
        if (accumulator >= threshold) {
          selectedIndex = index;
          break;
        }
      }

      const [selected] = available.splice(selectedIndex, 1);
      picked.push(selected);
      usedSet.add(selected.id);
    }

    return picked;
  }

  async function buildBatch(words, batchSize, newTarget) {
    void newTarget;
    const nowMs = Date.now();
    const progressList = await window.PaperGardenProgressStore.readAllProgress();
    const progressByWordId = new Map(progressList.map((entry) => [entry.wordId, entry]));

    const nonMasteredPool = [];
    const masteredPool = [];

    words.forEach((word) => {
      const progress = progressByWordId.get(word.id);
      const bucket = window.PaperGardenProgressStore.toStatusForSelection(progress, nowMs);

      if (bucket === "mastered") {
        masteredPool.push(word);
      } else {
        nonMasteredPool.push(word);
      }
    });

    const pickedIds = new Set();
    const weightedLearningWords = pickWeightedFromPool(
      nonMasteredPool,
      Math.min(batchSize, nonMasteredPool.length),
      pickedIds,
      (word) => {
        const progress = progressByWordId.get(word.id);
        const mastery = window.PaperGardenProgressStore.getMasteryScore(progress);
        return 1 + (1 - mastery) * 9;
      }
    );

    const remainingAfterLearning = Math.max(0, batchSize - weightedLearningWords.length);
    const masteredWords = pickFromPool(masteredPool, remainingAfterLearning, pickedIds);

    const fallbackPool = [...nonMasteredPool, ...masteredPool];
    const remainingFallbackSlots = Math.max(0, batchSize - (weightedLearningWords.length + masteredWords.length));
    const fallbackWords = pickFromPool(fallbackPool, remainingFallbackSlots, pickedIds);

    return [...weightedLearningWords, ...masteredWords, ...fallbackWords].map((word) => word.id);
  }

  async function startNewSession(options = {}) {
    const batchSize = options.batchSize || 10;
    const newTarget = options.newTarget || 5;
    const words = await window.PaperGardenVocabStore.loadWords();

    const wordIds = await buildBatch(words, batchSize, newTarget);
    const session = {
      sessionId: randomId(),
      status: "active",
      createdAt: Date.now(),
      completedAt: null,
      correctAttempts: 0,
      wrongAttempts: 0,
      wordIds,
      stageCursor: {
        seeding: 0,
        watering: 0,
        pruning: 0,
      },
    };

    await writeSession(session);
    localStorage.setItem(ACTIVE_SESSION_KEY, session.sessionId);
    return session;
  }

  async function getActiveSession() {
    const sessionId = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!sessionId) {
      return null;
    }

    const session = await readSession(sessionId);
    if (!session || session.status !== "active") {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      return null;
    }

    return session;
  }

  async function ensureActiveSession() {
    const existingSession = await getActiveSession();
    if (existingSession) {
      return existingSession;
    }

    return startNewSession();
  }

  async function updateStageCursor(stageName, cursorIndex) {
    const session = await getActiveSession();
    if (!session) {
      return null;
    }

    session.stageCursor = session.stageCursor || {};
    session.stageCursor[stageName] = cursorIndex;
    await writeSession(session);
    return session;
  }

  function shuffleArray(array) {
    const cloned = [...array];
    for (let index = cloned.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [cloned[index], cloned[randomIndex]] = [cloned[randomIndex], cloned[index]];
    }
    return cloned;
  }

  async function updateWateringOrder(shuffledWordIds) {
    const session = await getActiveSession();
    if (!session) {
      return null;
    }

    session.wateringWordIds = shuffledWordIds;
    await writeSession(session);
    return session;
  }

  async function recordAttemptResult(isCorrect) {
    const session = await getActiveSession();
    if (!session) {
      return null;
    }

    if (isCorrect) {
      session.correctAttempts = (session.correctAttempts || 0) + 1;
    } else {
      session.wrongAttempts = (session.wrongAttempts || 0) + 1;
    }

    await writeSession(session);
    return session;
  }

  async function completeActiveSession() {
    const session = await getActiveSession();
    if (!session) {
      return null;
    }

    session.status = "completed";
    session.completedAt = Date.now();
    await writeSession(session);
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    return session;
  }

  async function getLatestCompletedSession() {
    const sessions = await readAllSessions();
    const completed = sessions.filter((session) => session.status === "completed" && session.completedAt);
    completed.sort((left, right) => right.completedAt - left.completedAt);
    return completed[0] || null;
  }

  window.PaperGardenSessionStore = {
    startNewSession,
    getActiveSession,
    ensureActiveSession,
    updateStageCursor,
    recordAttemptResult,
    completeActiveSession,
    getLatestCompletedSession,
    readAllSessions,
    updateWateringOrder,
  };
})();
