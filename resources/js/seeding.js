let isFlipped = false;
const card = document.getElementById("flashcard");

function flipCard() {
  isFlipped = !isFlipped;
  if (isFlipped) {
    card.classList.add("rotate-y-180");
  } else {
    card.classList.remove("rotate-y-180");
  }
}

window.flipCard = flipCard;

document.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("mousedown", () => {
    btn.style.transform = "scale(0.96)";
  });
  btn.addEventListener("mouseup", () => {
    btn.style.transform = "";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.transform = "";
  });
});

document.addEventListener("mousemove", (e) => {
  const x = (window.innerWidth / 2 - e.pageX) / 50;
  const y = (window.innerHeight / 2 - e.pageY) / 50;
  const illustrations = document.querySelectorAll("img[data-alt]");
  illustrations.forEach((img) => {
    img.style.transform = `translate(${x}px, ${y}px)`;
  });
});

window.renderFooter({ active: "home" });
