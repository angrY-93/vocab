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

  function toStatusForSelection(record, nowMs) {
    if (!record) {
      return "new";
    }

    if (record.status === "mastered") {
      return "mastered";
    }

    if (record.nextReviewAt && record.nextReviewAt <= nowMs) {
      return "review";
    }

    return "learning";
  }

  function getNextReviewMs(correctStreak, isCorrect) {
    if (!isCorrect) {
      return Date.now() + 12 * 60 * 60 * 1000;
    }

    const dayMs = 24 * 60 * 60 * 1000;
    if (correctStreak <= 1) {
      return Date.now() + dayMs;
    }
    if (correctStreak === 2) {
      return Date.now() + 3 * dayMs;
    }
    if (correctStreak === 3) {
      return Date.now() + 7 * dayMs;
    }
    return Date.now() + 14 * dayMs;
  }

  async function recordAttempt(wordId, isCorrect) {
    const nowMs = Date.now();
    const existing = await readProgress(wordId);

    const current = existing || {
      wordId,
      status: "new",
      proficiency: 0,
      correctStreak: 0,
      wrongCount: 0,
      seenCount: 0,
      lastSeenAt: null,
      nextReviewAt: nowMs,
    };

    const updated = {
      ...current,
      seenCount: (current.seenCount || 0) + 1,
      lastSeenAt: nowMs,
    };

    if (isCorrect) {
      updated.correctStreak = (current.correctStreak || 0) + 1;
      updated.proficiency = Math.min(100, (current.proficiency || 0) + 12);
      updated.nextReviewAt = getNextReviewMs(updated.correctStreak, true);
      updated.status = updated.proficiency >= 85 && updated.correctStreak >= 4 ? "mastered" : "learning";
    } else {
      updated.correctStreak = 0;
      updated.wrongCount = (current.wrongCount || 0) + 1;
      updated.proficiency = Math.max(0, (current.proficiency || 0) - 8);
      updated.nextReviewAt = getNextReviewMs(0, false);
      updated.status = "review";
    }

    await writeProgress(updated);
    return updated;
  }

  window.PaperGardenProgressStore = {
    readAllProgress,
    readProgress,
    writeProgress,
    recordAttempt,
    toStatusForSelection,
  };
})();
