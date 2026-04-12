const fs = require('fs');
const path = require('path');

const files = [
  'mobile-frontend/hooks/useDashboard.js',
  'mobile-frontend/hooks/useWorkout.js',
  'mobile-frontend/hooks/useProfile.js',
  'mobile-frontend/hooks/useInsights.js',
  'mobile-frontend/hooks/useNutrition.js',
  'mobile-frontend/hooks/useOnboarding.ts',
  'mobile-frontend/hooks/useYaraChat.ts',
  'mobile-frontend/services/dashboardService.js',
  'mobile-frontend/services/yaraInsightsService.js',
  'mobile-frontend/services/foodScannerApi.js',
  'mobile-frontend/services/nutritionService.js',
  'mobile-frontend/services/workoutService.ts',
  'mobile-frontend/services/exerciseService.ts',
  'mobile-frontend/services/authService.ts',
  'mobile-frontend/screens/Insights.js',
  'mobile-frontend/screens/Training.js',
  'mobile-frontend/screens/workout/WorkoutActive.js',
  'mobile-frontend/screens/workout/WorkoutSummary.js',
  'mobile-frontend/screens/onboarding/OnboardingDone.js',
  'mobile-frontend/screens/nutrition/MealLogger.js',
  'mobile-frontend/screens/Profile.js',
  'mobile-frontend/App.js',
  'mobile-frontend/lib/eventBus.js',
  'mobile-frontend/lib/supabase.ts',
  'mobile-frontend/components/food-scanner/PhotoAnalyser.js',
  'mobile-frontend/components/YaraAssistant.js',
];

let changed = 0;

for (const relPath of files) {
  const fullPath = path.resolve(relPath);
  if (!fs.existsSync(fullPath)) {
    console.log('SKIP (not found):', relPath);
    continue;
  }
  let code = fs.readFileSync(fullPath, 'utf8');

  const hasLog = /console\.log\(/.test(code);
  const hasWarn = /console\.warn\(/.test(code);
  const hasError = /console\.error\(/.test(code);

  if (!hasLog && !hasWarn && !hasError) {
    console.log('SKIP (no console calls):', relPath);
    continue;
  }

  const members = [];
  if (hasLog) members.push('log');
  if (hasWarn) members.push('warn');
  if (hasError) members.push('error as logError');

  const fileDir = path.dirname(relPath);
  let loggerRelPath = path.relative(fileDir, 'mobile-frontend/lib/logger').split(path.sep).join('/');
  if (!loggerRelPath.startsWith('.')) loggerRelPath = './' + loggerRelPath;

  const importLine = "import { " + members.join(', ') + " } from '" + loggerRelPath + "';";

  // Find last import line
  const importRegex = /^import .+$/gm;
  let lastImportEnd = 0;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    lastImportEnd = match.index + match[0].length;
  }

  if (lastImportEnd > 0) {
    code = code.slice(0, lastImportEnd) + '\n' + importLine + code.slice(lastImportEnd);
  } else {
    code = importLine + '\n' + code;
  }

  if (hasLog) code = code.replace(/console\.log\(/g, 'log(');
  if (hasWarn) code = code.replace(/console\.warn\(/g, 'warn(');
  if (hasError) code = code.replace(/console\.error\(/g, 'logError(');

  fs.writeFileSync(fullPath, code, 'utf8');
  changed++;
  console.log('DONE:', relPath, '(' + members.join(', ') + ')');
}

console.log('\n' + changed + ' files updated');
