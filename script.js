// Move the runner dot down the track as the page scrolls.
const runner = document.getElementById('runner');
let ticking = false;

function update() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const progress = max > 0 ? window.scrollY / max : 0;
  const y = progress * (window.innerHeight - 9);
  runner.style.transform = `translateY(${y}px)`;
  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) { requestAnimationFrame(update); ticking = true; }
}, { passive: true });
window.addEventListener('resize', update);
update();
