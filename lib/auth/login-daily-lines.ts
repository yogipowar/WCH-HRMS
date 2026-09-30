export const LOGIN_DAILY_LINES = [
  "Happy to see you again. The admin and your pending tasks are waiting for you. 😉",
  "Happy to see you again. You are the best team member of Web Create Hub. 😅",
  "Welcome back. Your desk missed you. Your tasks missed you more. 😄",
  "Good to see you. The attendance sheet already knows you are here. 😊",
  "Hello again. Coffee is optional. Signing in is not. 😉",
  "You are back. The leave requests can relax now. 😅",
  "Happy to see you. Web Create Hub runs better when you are here. 😄",
  "Back so soon? Your pending approvals were starting to feel lonely. 😅",
  "Nice to see you. The team is glad you showed up. The tasks are glad too. 😊",
  "Welcome back, star of Web Create Hub. The dashboard saved you a seat. 😉",
  "Hello again. Nothing starts until you do, so here we are. 😅",
  "Good to have you back. Pending work called. It says it can wait five more minutes. 😉",
  "Welcome back. Sign in, smile, and pretend the inbox is a small one. 😄",
] as const;

export function loginLineForDate(date: Date) {
  const index = (date.getDate() - 1) % LOGIN_DAILY_LINES.length;
  return LOGIN_DAILY_LINES[index];
}

export function millisecondsUntilNextLocalMidnight(date: Date) {
  const nextMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return Math.max(0, nextMidnight.getTime() - date.getTime());
}
