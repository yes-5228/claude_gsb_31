import { http } from './client.js';

const RESOURCE = '/restrooms';

export const restroomApi = {
  list: (params) => http.get(RESOURCE, params),
  detail: (id) => http.get(`${RESOURCE}/${id}`),
  create: (payload) => http.post(RESOURCE, payload),
  update: (id, payload) => http.patch(`${RESOURCE}/${id}`, payload),
  remove: (id, params) => http.delete(`${RESOURCE}/${id}`, params),
  districts: () => http.get(`${RESOURCE}/meta/districts`),
};
