// One response envelope for every endpoint: { success, data, error }.
export function ok(res, status, data) {
  return res.status(status).json({ success: true, data, error: null });
}

export function fail(res, status, error) {
  return res.status(status).json({ success: false, data: null, error });
}
