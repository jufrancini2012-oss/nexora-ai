const state = { active: true, mode: 'balanced', minScore: 80, minMargin: 25, testsToday: 0, budgetToday: 0 };
window.autonomyState = state;
window.setAutonomy = (active) => { state.active = active; render(); };
window.setMode = (mode) => { state.mode = mode; render(); };
function render(){
  const el=document.querySelector('[data-autonomy-state]'); if(!el)return;
  el.textContent=state.active?'ATIVO':'PAUSADO';
  el.dataset.active=state.active;
  const mode=document.querySelector('[data-autonomy-mode]'); if(mode) mode.textContent=state.mode.toUpperCase();
}
document.addEventListener('DOMContentLoaded',render);
