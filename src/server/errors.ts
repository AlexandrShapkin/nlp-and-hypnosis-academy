export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}
export const conflict = (message = "Revision conflict") =>
  new ApiError(409, "CONFLICT", message);
