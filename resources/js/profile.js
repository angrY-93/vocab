(function () {
  function formatPercent(correctAttempts, wrongAttempts) {
    const total = (correctAttempts || 0) + (wrongAttempts || 0);
    if (total <= 0) {
      return "N/A";
    }
    const percent = Math.round(((correctAttempts || 0) / total) * 100);
    return `${percent}%`;
  }

  function formatCompletedAt(timestamp) {
    if (!timestamp) {
      return "N/A";
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return "N/A";
    }

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  async function loadProfileSummary() {
    const [latestCompletedSession, progressList, words] = await Promise.all([
      window.PaperGardenSessionStore.getLatestCompletedSession(),
      window.PaperGardenProgressStore.readAllProgress(),
      window.PaperGardenVocabStore.loadWords(),
    ]);

    const progressByWordId = new Map(progressList.map((record) => [record.wordId, record]));
    let masteredCount = 0;
    let unseenCount = 0;
    let inProgressCount = 0;

    words.forEach((word) => {
      const record = progressByWordId.get(word.id);
      const mastery = window.PaperGardenProgressStore.getMasteryScore(record);
      const attempts = record && Number.isFinite(record.attemptCount)
        ? record.attemptCount
        : record && Number.isFinite(record.seenCount)
          ? record.seenCount
          : 0;

      if (attempts <= 0) {
        unseenCount += 1;
      } else if (mastery > 0.95) {
        masteredCount += 1;
      } else {
        inProgressCount += 1;
      }
    });

    const sessionScore = latestCompletedSession
      ? formatPercent(latestCompletedSession.correctAttempts, latestCompletedSession.wrongAttempts)
      : "N/A";
    const completedAt = formatCompletedAt(latestCompletedSession?.completedAt);

    document.getElementById("profile-last-score").textContent = sessionScore;
    document.getElementById("profile-mastered-count").textContent = String(masteredCount);
    document.getElementById("profile-unseen-count").textContent = String(unseenCount);
    document.getElementById("profile-in-progress-count").textContent = String(inProgressCount);
    document.getElementById("profile-last-completed").textContent = `Last completed: ${completedAt}`;
  }

  window.renderFooter({ active: "profile" });
  loadProfileSummary().catch((error) => {
    console.error(error);
  });
})();
