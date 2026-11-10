import { z } from "zod";

export const movieSchema = z
  .string()
  .trim()
  .min(1, "Please enter a movie title.")
  .max(120, "Movie titles must be 120 characters or fewer.")
  .refine((title) => !/[\u0000-\u001f\u007f]/.test(title), "Please enter a title without control characters.");
