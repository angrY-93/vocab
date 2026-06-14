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
    const [latestCompletedSession, progressList] = await Promise.all([
      window.PaperGardenSessionStore.getLatestCompletedSession(),
      window.PaperGardenProgressStore.readAllProgress(),
    ]);

    const masteredCount = progressList.filter((record) => record.status === "mastered").length;
    const nowMs = Date.now();
    const dueCount = progressList.filter((record) => record.nextReviewAt && record.nextReviewAt <= nowMs).length;

    const sessionScore = latestCompletedSession
      ? formatPercent(latestCompletedSession.correctAttempts, latestCompletedSession.wrongAttempts)
      : "N/A";
    const completedAt = formatCompletedAt(latestCompletedSession?.completedAt);

    document.getElementById("profile-last-score").textContent = sessionScore;
    document.getElementById("profile-mastered-count").textContent = String(masteredCount);
    document.getElementById("profile-due-count").textContent = String(dueCount);
    document.getElementById("profile-last-completed").textContent = `Last completed: ${completedAt}`;
  }

  window.renderFooter({ active: "profile" });
  loadProfileSummary().catch((error) => {
    console.error(error);
  });
})();
