// Источник «сейчас». Приложение не вызывает `new Date()` напрямую, чтобы тесты могли зафиксировать время.
export type Clock = () => Date;

export const systemClock: Clock = () => new Date();
