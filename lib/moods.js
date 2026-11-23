export const MOODS = [['😊', 'Happy'], ['😌', 'Calm'], ['🥰', 'Grateful'], ['🤩', 'Excited'], ['😐', 'Okay'], ['😴', 'Tired'], ['😔', 'Low'], ['😰', 'Anxious'], ['😣', 'Stressed']];
export const SCORE = { Happy: 5, Excited: 5, Grateful: 5, Calm: 4, Okay: 3, Tired: 2, Anxious: 2, Low: 1, Stressed: 1 };
export const EMOJI = Object.fromEntries(MOODS.map(([e, l]) => [l, e]));
