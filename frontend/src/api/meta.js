import { http } from './client.js';

export const metaApi = {
  dictionaries: () => http.get('/meta/dictionaries'),
  restroomOptions: (keyword) => http.get('/meta/restroom-options', { keyword }),
};
