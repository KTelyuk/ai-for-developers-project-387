import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Ajv } from 'ajv';
import addFormatsModule from 'ajv-formats';
import type { LightMyRequestResponse as InjectResponse } from 'fastify';
import { expect } from 'vitest';
import { parse } from 'yaml';

// Сверка ответа API со схемой из openapi/openapi.yaml: тест ловит расхождение кода и контракта.
const specPath = fileURLToPath(new URL('../../openapi/openapi.yaml', import.meta.url));
const spec = parse(readFileSync(specPath, 'utf8'));

// ajv-formats — CommonJS-модуль: в ESM функция лежит в `default`.
const addFormats = addFormatsModule as unknown as (ajv: Ajv) => Ajv;
const ajv = addFormats(new Ajv({ strict: false, allErrors: true }));
ajv.addSchema(spec, 'openapi');

// JSON Pointer: `/` и `~` внутри сегмента экранируются.
function pointer(...segments: string[]) {
  return segments.map((segment) => segment.replaceAll('~', '~0').replaceAll('/', '~1')).join('/');
}

export function expectMatchesContract(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  pathTemplate: string,
  response: InjectResponse,
) {
  const status = String(response.statusCode);
  const responses = spec.paths?.[pathTemplate]?.[method]?.responses;
  expect(
    responses?.[status],
    `${method.toUpperCase()} ${pathTemplate} → ${status} в контракте`,
  ).toBeDefined();

  const ref = `openapi#/${pointer('paths', pathTemplate, method, 'responses', status, 'content', 'application/json', 'schema')}`;
  const validate = ajv.compile({ $ref: ref });
  const valid = validate(response.json());
  expect(validate.errors ?? [], `ответ ${method.toUpperCase()} ${pathTemplate} по схеме`).toEqual(
    [],
  );
  expect(valid).toBe(true);
}
