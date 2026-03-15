// Simple pub-sub controller for Yara assistant state
const subscribers = new Set();
let currentState = {
  message: "Hi! I'm Yara, your personal AI fitness assistant! 🌟 I'm so excited to help you transform your fitness journey. Ready to get started?",
  emotion: 'neutral',
  coachStyle: 'motivational',
  isTyping: false,
  showDownloadPrompt: false
};

export function subscribe(fn) {
  subscribers.add(fn);
  // send current state immediately
  fn(currentState);
  return () => subscribers.delete(fn);
}

export function setYaraState(partial) {
  currentState = { ...currentState, ...partial };
  subscribers.forEach(fn => {
    try { fn(currentState); } catch (e) { console.error('yara subscriber error', e); }
  });
}

export function getYaraState() {
  return currentState;
}

export default { subscribe, setYaraState, getYaraState };
