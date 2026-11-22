import { setupServer } from 'msw/node';

// Сеть в тестах. Обработчики добавляются в тестах через `server.use(...)` и сбрасываются после каждого.
// Запрос без обработчика — ошибка: тест не уйдёт в настоящую сеть незамеченным.
export const server = setupServer();

// Все запросы, начатые с последнего сброса: так тест проверяет, что страница не ходит в API.
let requests: Request[] = [];
server.events.on('request:start', ({ request }) => {
  requests.push(request);
});

export function startedRequests(): readonly Request[] {
  return requests;
}

export function resetStartedRequests() {
  requests = [];
}
