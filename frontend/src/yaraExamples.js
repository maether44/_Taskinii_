import { setYaraState } from './yaraController';

export function showOnboardingComplete(formData = {}) {
  setYaraState({
    message: "AMAZING! 🎉 Welcome to the BodyQ family! Your personalized workout plan is ready. Now you can track everything in our mobile app!",
    emotion: 'celebrating',
    coachStyle: formData.coachPersonality || 'motivational',
    isTyping: true,
    showDownloadPrompt: true
  });
}

export function showStreak(days = 7) {
  setYaraState({
    message: `${days} DAY STREAK! 🔥 YOU'RE ON FIRE! Keep crushing it!`,
    emotion: 'hyped',
    coachStyle: 'motivational',
    isTyping: false
  });
}

export function giveSeriousAdvice() {
  setYaraState({
    message: "Remember to listen to your body. Form is more important than weight.",
    emotion: 'thinking',
    coachStyle: 'neutral',
    isTyping: false
  });
}

export function celebrateWorkout() {
  setYaraState({
    message: "INCREDIBLE WORKOUT! That's what I'm talking about! 💪",
    emotion: 'excited',
    coachStyle: 'strict',
    isTyping: false
  });
}

export default { showOnboardingComplete, showStreak, giveSeriousAdvice, celebrateWorkout };
