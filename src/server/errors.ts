export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details?: Record<string, string | number>,
  ) {
    super(code);
    this.name = "ApiError";
  }
}
