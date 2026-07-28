const valentineConfig = globalThis.valentineConfig;

const elements = {
  card: document.querySelector(".valentine-card"),
  questionView: document.getElementById("questionView"),
  question: document.getElementById("valentineQuestion"),
  image: document.getElementById("imageDisplay"),
  status: document.getElementById("statusMessage"),
  stage: document.getElementById("responseStage"),
  yesButton: document.getElementById("yesButton"),
  noButton: document.getElementById("noButton"),
  resultView: document.getElementById("resultView"),
  resultImage: document.getElementById("resultImage"),
  resultSticker: document.getElementById("resultSticker"),
  resultTitle: document.getElementById("resultTitle"),
  shareButton: document.getElementById("shareButton"),
  replayButton: document.getElementById("replayButton"),
  shareStatus: document.getElementById("shareStatus"),
  confettiLayer: document.getElementById("confettiLayer"),
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const clickSound = new Audio(valentineConfig.soundPath);
clickSound.preload = "auto";

let noStep = 0;
let runawayActive = false;

function applyConfig() {
  document.title = valentineConfig.pageTitle;
  elements.question.textContent = valentineConfig.question;
  elements.status.textContent = "";
  elements.yesButton.textContent = valentineConfig.yesLabels[0];
  elements.noButton.textContent = valentineConfig.noSteps[0].label;
  elements.image.src = valentineConfig.images[0];
  elements.image.alt = valentineConfig.imageAlts[0];
  elements.resultSticker.src = valentineConfig.stickerImage;

  valentineConfig.images.concat(valentineConfig.success.image, valentineConfig.decline.image).forEach((path) => {
    const image = new Image();
    image.src = path;
  });
}

function playClick() {
  try {
    clickSound.currentTime = 0;
    const playback = clickSound.play();
    if (playback) playback.catch(() => {});
  } catch {
    // Sound is decorative; interaction should never depend on it.
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function rectanglesOverlap(first, second, padding = 8) {
  return !(
    first.right + padding < second.left ||
    first.left > second.right + padding ||
    first.bottom + padding < second.top ||
    first.top > second.bottom + padding
  );
}

function moveRunawayButton() {
  if (!runawayActive || prefersReducedMotion.matches) return;

  const stageRect = elements.stage.getBoundingClientRect();
  const buttonRect = elements.noButton.getBoundingClientRect();
  const yesRect = elements.yesButton.getBoundingClientRect();
  const inset = 4;
  const maxLeft = Math.max(inset, elements.stage.clientWidth - buttonRect.width - inset);
  const maxTop = Math.max(inset, elements.stage.clientHeight - buttonRect.height - inset);
  let left = inset;
  let top = inset;
  let candidateOverlaps = true;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    left = inset + Math.random() * Math.max(0, maxLeft - inset);
    top = inset + Math.random() * Math.max(0, maxTop - inset);
    const candidate = {
      left: stageRect.left + left,
      right: stageRect.left + left + buttonRect.width,
      top: stageRect.top + top,
      bottom: stageRect.top + top + buttonRect.height,
    };

    candidateOverlaps = rectanglesOverlap(candidate, yesRect);
    if (!candidateOverlaps) break;
  }

  if (candidateOverlaps) {
    const belowYes = yesRect.bottom - stageRect.top + 12;
    const aboveYes = yesRect.top - stageRect.top - buttonRect.height - 12;
    if (belowYes <= maxTop) top = belowYes;
    else if (aboveYes >= inset) top = aboveYes;
  }

  elements.noButton.style.left = `${clamp(left, inset, maxLeft)}px`;
  elements.noButton.style.top = `${clamp(top, inset, maxTop)}px`;
}

function activateRunawayButton() {
  runawayActive = true;
  elements.stage.classList.add("has-runaway");

  if (prefersReducedMotion.matches) {
    elements.noButton.setAttribute("aria-label", "Say yes or else. Activate again to decline.");
    return;
  }

  elements.noButton.classList.add("is-runaway");
  elements.noButton.setAttribute("aria-label", `${elements.noButton.textContent}. This button playfully moves for pointer users.`);

  requestAnimationFrame(() => {
    moveRunawayButton();
  });
}

function handleNo() {
  playClick();

  if (runawayActive) {
    if (prefersReducedMotion.matches) {
      showResult("decline");
      return;
    }
    moveRunawayButton();
    return;
  }

  noStep = Math.min(noStep + 1, valentineConfig.noSteps.length - 1);
  const step = valentineConfig.noSteps[noStep];
  elements.noButton.textContent = step.label;
  elements.yesButton.textContent = valentineConfig.yesLabels[noStep];
  elements.status.textContent = "";
  elements.image.src = valentineConfig.images[Math.min(noStep, valentineConfig.images.length - 1)];
  elements.image.alt = valentineConfig.imageAlts[Math.min(noStep, valentineConfig.imageAlts.length - 1)];
  elements.yesButton.style.setProperty("--yes-scale", String(Math.min(1 + noStep * 0.1, 1.3)));

  if (noStep === valentineConfig.noSteps.length - 1) activateRunawayButton();
}

function showResult(type) {
  const content = valentineConfig[type];
  playClick();
  elements.questionView.hidden = true;
  elements.resultView.hidden = false;
  elements.resultView.classList.toggle("is-declined", type === "decline");
  elements.resultImage.src = content.image;
  elements.resultImage.alt = content.imageAlt;
  elements.resultTitle.textContent = content.title;
  elements.shareStatus.textContent = "";
  elements.resultTitle.focus?.();

  if (type === "success") launchConfetti();
}

function resetExperience() {
  noStep = 0;
  runawayActive = false;
  elements.confettiLayer.replaceChildren();
  elements.resultView.hidden = true;
  elements.resultView.classList.remove("is-declined");
  elements.questionView.hidden = false;
  elements.image.src = valentineConfig.images[0];
  elements.image.alt = valentineConfig.imageAlts[0];
  elements.noButton.textContent = valentineConfig.noSteps[0].label;
  elements.yesButton.textContent = valentineConfig.yesLabels[0];
  elements.noButton.classList.remove("is-runaway");
  elements.stage.classList.remove("has-runaway");
  elements.noButton.removeAttribute("aria-label");
  elements.noButton.removeAttribute("style");
  elements.yesButton.style.removeProperty("--yes-scale");
  elements.status.textContent = "";
  elements.yesButton.focus();
}

async function shareResult() {
  const shareData = {
    title: valentineConfig.pageTitle,
    text: valentineConfig.shareText,
    url: window.location.href,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      elements.shareStatus.textContent = "Shared with love.";
      return;
    }

    await navigator.clipboard.writeText(window.location.href);
    elements.shareStatus.textContent = "Link copied to your clipboard.";
  } catch (error) {
    if (error?.name !== "AbortError") {
      elements.shareStatus.textContent = "Sharing was not available, but the good news is still official.";
    }
  }
}

function launchConfetti() {
  if (prefersReducedMotion.matches) return;

  const colors = ["#a62947", "#176b55", "#e0a92c", "#f08da2", "#ffffff"];
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < 70; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.setProperty("--left", `${Math.random() * 100}%`);
    piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 240}px`);
    piece.style.setProperty("--spin", `${Math.random() * 900 - 450}deg`);
    piece.style.setProperty("--duration", `${1.9 + Math.random() * 1.3}s`);
    piece.style.setProperty("--delay", `${Math.random() * 0.45}s`);
    piece.style.setProperty("--color", colors[index % colors.length]);
    fragment.appendChild(piece);
  }

  elements.confettiLayer.replaceChildren(fragment);
  window.setTimeout(() => elements.confettiLayer.replaceChildren(), 3800);
}

elements.yesButton.addEventListener("click", () => showResult("success"));
elements.noButton.addEventListener("click", handleNo);
elements.noButton.addEventListener("pointerenter", () => {
  if (runawayActive && hasFinePointer.matches) moveRunawayButton();
});
elements.noButton.addEventListener("keydown", (event) => {
  if (runawayActive && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    showResult("decline");
  }
});
elements.replayButton.addEventListener("click", resetExperience);
elements.shareButton.addEventListener("click", shareResult);
window.addEventListener("resize", () => requestAnimationFrame(moveRunawayButton));

applyConfig();
