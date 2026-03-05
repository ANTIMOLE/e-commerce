// ============================================================
// RESPONSE HELPERS
// Dipakai oleh backend-rest untuk konsistensi format response.
// tRPC tidak butuh ini — dia return data langsung.
// Tapi disimpen di shared supaya bisa dibandingkan payload size-nya.
// ============================================================

export interface SuccessResponse<T> {
  success: true;
  data:    T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error:   string;
  code?:   string;
}

export function successResponse<T>(data: T, message?: string): SuccessResponse<T> {
  return { success: true, data, ...(message ? { message } : {}) };
}

export function errorResponse(error: string, code?: string): ErrorResponse {
  return { success: false, error, ...(code ? { code } : {}) };
}
