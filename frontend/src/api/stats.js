import { http } from './client.js';

export const statsApi = {
  overview: () => http.get('/stats/overview'),
  dashboard: (trendDays = 14) => http.get('/stats/dashboard', { trend_days: trendDays }),
};
