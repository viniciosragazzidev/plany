import { z } from "zod";

/**
 * Standard Action Response Type
 */
export type ActionResponse<T> = 
  | { success: true; data: T; message: string }
  | { success: false; data: null; message: string; error: string };

/**
 * Error utility to create a failure response
 */
export function actionError(message: string): ActionResponse<any> {
  return {
    success: false,
    data: null,
    message,
    error: message,
  };
}

/**
 * Success utility to create a successful response
 */
export function actionSuccess<T>(data: T, message: string = "Operação realizada com sucesso"): ActionResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Common Zod Schemas
 */
export const IdSchema = z.string().uuid();
export const TitleSchema = z.string().min(1).max(255);
