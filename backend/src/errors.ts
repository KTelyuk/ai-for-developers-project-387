import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ApiError as ErrorBody, ErrorCode } from './api/types.gen.ts';

// Коды и формат ошибки берутся из контракта (typespec/main.tsp, `ErrorCode` и `ApiError`).
export type { ErrorBody, ErrorCode };

// Ошибка, которую обработчик бросает, чтобы ответить 4xx в едином формате.
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;

  constructor(statusCode: number, code: ErrorCode, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

// Ответ на неизвестный путь в едином формате; подключает `buildApp` вместе с отдачей фронтенда.
export function sendNotFound(request: FastifyRequest, reply: FastifyReply) {
  const body: ErrorBody = {
    code: 'NOT_FOUND',
    message: `Route ${request.method} ${request.url} not found`,
  };
  return reply.status(404).send(body);
}

// Все ответы ошибок — `{ code, message }`: ошибки обработчиков, валидации из OpenAPI и 500.
export function registerErrorHandling(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | ApiError, request, reply) => {
    if (error instanceof ApiError) {
      const body: ErrorBody = { code: error.code, message: error.message };
      return reply.status(error.statusCode).send(body);
    }
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 400 && statusCode < 500) {
      // Ошибки самого Fastify: валидация по схеме OpenAPI, неверный JSON, неподдерживаемый тип тела.
      const body: ErrorBody = {
        code: statusCode === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR',
        message: error.message,
      };
      return reply.status(statusCode).send(body);
    }
    request.log.error(error);
    const body: ErrorBody = { code: 'INTERNAL_ERROR', message: 'Internal Server Error' };
    return reply.status(500).send(body);
  });
}
