(function () {
  const DB_NAME = "paper-garden-db";
  const DB_VERSION = 2;
  const PROGRESS_STORE = "progress";
  const SESSION_STORE = "sessions";

  let dbPromise = null;

  function ensureStores(db) {
    if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
      const store = db.createObjectStore(PROGRESS_STORE, { keyPath: "wordId" });
      store.createIndex("status", "status", { unique: false });
      store.createIndex("nextReviewAt", "nextReviewAt", { unique: false });
    }

    if (!db.objectStoreNames.contains(SESSION_STORE)) {
      db.createObjectStore(SESSION_STORE, { keyPath: "sessionId" });
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

  async function readAllProgress() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PROGRESS_STORE, "readonly");
      const store = transaction.objectStore(PROGRESS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function readProgress(wordId) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PROGRESS_STORE, "readonly");
      const store = transaction.objectStore(PROGRESS_STORE);
      const request = store.get(wordId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async function writeProgress(record) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PROGRESS_STORE, "readwrite");
      const store = transaction.objectStore(PROGRESS_STORE);
      store.put(record);

      transaction.oncomplete = () => resolve(record);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  function asNumber(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
  }

  function normalizeRecord(record) {
    if (!record) {
      return null;
    }

    const attemptCount = asNumber(record.attemptCount, asNumber(record.seenCount, 0));
    const legacyCorrect = Math.max(0, asNumber(record.correctStreak, 0));
    const correctCount = Math.min(
      attemptCount,
      asNumber(record.correctCount, legacyCorrect)
    );
    const masteryScore = attemptCount > 0 ? correctCount / attemptCount : 0;
    const status = masteryScore > 0.95 ? "mastered" : attemptCount > 0 ? "learning" : "new";

    return {
      ...record,
      attemptCount,
      correctCount,
      masteryScore,
      status,
    };
  }

  function getMasteryScore(record) {
    const normalized = normalizeRecord(record);
    return normalized ? normalized.masteryScore : 0;
  }

  function isMastered(record) {
    return getMasteryScore(record) > 0.95;
  }

  function toStatusForSelection(record, nowMs) {
    void nowMs;
    if (!record) {
      return "new";
    }

    const normalized = normalizeRecord(record);
    if (!normalized || normalized.attemptCount <= 0) {
      return "new";
    }

    if (normalized.masteryScore > 0.95) {
      return "mastered";
    }

    return "learning";
  }

  async function recordAttempt(wordId, isCorrect) {
    const nowMs = Date.now();
    const existing = normalizeRecord(await readProgress(wordId));

    const current = existing || {
      wordId,
      status: "new",
      seenCount: 0,
      attemptCount: 0,
      correctCount: 0,
      masteryScore: 0,
      lastSeenAt: null,
    };

    const nextAttemptCount = (current.attemptCount || 0) + 1;
    const nextCorrectCount = (current.correctCount || 0) + (isCorrect ? 1 : 0);
    const nextMasteryScore = nextCorrectCount / nextAttemptCount;

    const updated = {
      ...current,
      seenCount: (current.seenCount || 0) + 1,
      attemptCount: nextAttemptCount,
      correctCount: nextCorrectCount,
      masteryScore: nextMasteryScore,
      lastSeenAt: nowMs,
      status: nextMasteryScore > 0.95 ? "mastered" : "learning",
    };

    await writeProgress(updated);
    return updated;
  }

  window.PaperGardenProgressStore = {
    readAllProgress,
    readProgress,
    writeProgress,
    recordAttempt,
    toStatusForSelection,
    getMasteryScore,
    isMastered,
  };
})();
