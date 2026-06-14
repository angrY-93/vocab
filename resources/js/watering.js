function checkAnswer(btn, word) {
  const correctAnswer = "diligent";
  const gap = document.getElementById("sentence-gap");
  const animation = document.getElementById("watering-animation");
  const drawer = document.getElementById("success-drawer");

  if (word === correctAnswer) {
    btn.classList.remove("bg-surface-white", "text-on-surface");
    btn.classList.add("bg-primary-container", "text-on-primary-container", "border-primary", "success-glow");

    gap.innerText = word;
    gap.classList.remove("text-primary-container");
    gap.classList.add("text-primary", "font-bold");

    if (animation) {
      animation.classList.remove("hidden");
    }

    setTimeout(() => {
      drawer.classList.remove("translate-y-full");
      document.getElementById("progress-bar").style.width = "100%";
    }, 600);

    document.querySelectorAll(".word-option").forEach((button) => {
      button.disabled = true;
    });
  } else {
    btn.classList.add("shake", "bg-error-soft", "border-error", "text-error-text");
    setTimeout(() => {
      btn.classList.remove("shake", "bg-error-soft", "border-error", "text-error-text");
    }, 1000);

    const hint = document.getElementById("feedback-hint");
    hint.classList.remove("opacity-0");
  }
}

function resetPage() {
  location.reload();
}

window.checkAnswer = checkAnswer;
window.resetPage = resetPage;

setTimeout(() => {
  document.getElementById("feedback-hint").classList.remove("opacity-0");
}, 1500);

window.renderFooter({ active: "home" });
