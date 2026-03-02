// services/exerciseService.js
const BASE_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main";

export const fetchExercises = async () => {
  const res = await fetch(`${BASE_URL}/dist/exercises.json`);
  const data = await res.json();
  return data;
};

export const getImageUrl = (imagePath) =>
  `${BASE_URL}/exercises/${imagePath}`;