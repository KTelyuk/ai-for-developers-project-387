# Changelog

## [0.3.0](https://github.com/KTelyuk/ai-for-developers-project-387/compare/v0.2.0...v0.3.0) (2026-11-24)


### Features

* предмет разговора в записи ([#15](https://github.com/KTelyuk/ai-for-developers-project-387/issues/15)) ([#28](https://github.com/KTelyuk/ai-for-developers-project-387/issues/28)) ([289ac81](https://github.com/KTelyuk/ai-for-developers-project-387/commit/289ac81ba6b88ea1cd62aaff981095f1b78b9068))

## [0.2.0](https://github.com/KTelyuk/ai-for-developers-project-387/compare/v0.1.0...v0.2.0) (2026-11-22)


### Features

* каркас приложения с проверками и CI ([6f5b0b2](https://github.com/KTelyuk/ai-for-developers-project-387/commit/6f5b0b226484ce7a1a7c62c8882763d704da1e4a))
* главная страница и заглушка бронирования ([89ede84](https://github.com/KTelyuk/ai-for-developers-project-387/commit/89ede8433e92d1b7b08816792b1603f40d294ace))
* часы, хранилище в памяти, единый формат ошибок, MSW и покрытие ([cf4217b](https://github.com/KTelyuk/ai-for-developers-project-387/commit/cf4217b2849cd7bc3f44baaa2761c645e128ba36))
* типы встреч для владельца и гостя ([acd233e](https://github.com/KTelyuk/ai-for-developers-project-387/commit/acd233e260e5c4a3060d7bb59b646bd10aef8135))
* владелец редактирует типы встреч из списка ([bf6bc28](https://github.com/KTelyuk/ai-for-developers-project-387/commit/bf6bc280b9c503791a5032bce11142e2edfbb9ef))
* слоты дня для выбранного типа встречи ([b8c0d04](https://github.com/KTelyuk/ai-for-developers-project-387/commit/b8c0d041f254583b4e1bb0e8b1f2f3ec1716f44b))
* календарь доступности на 14 дней с числом свободных слотов ([2cd6369](https://github.com/KTelyuk/ai-for-developers-project-387/commit/2cd6369c9d51b0dcb717c54bf1964a195dcb4799))
* запись на слот и ссылка на запись ([16e7b16](https://github.com/KTelyuk/ai-for-developers-project-387/commit/16e7b169e66e2cd11ebc9293bdbde368695c2d8f))
* данные гостя сохраняются после конфликта записи ([520c38f](https://github.com/KTelyuk/ai-for-developers-project-387/commit/520c38fd69a650149eb39ff8597f2a0feda2d39e))
* страница записи гостя и отмена по ссылке ([ef3209a](https://github.com/KTelyuk/ai-for-developers-project-387/commit/ef3209aeb364a2693e107d8b18493ff3d4145074))
* гость изменяет свою запись по ссылке ([6ae1f20](https://github.com/KTelyuk/ai-for-developers-project-387/commit/6ae1f2036fd7417eda9eeeef735e48580fb691da))
* список записей владельца и отмена ([da97bc6](https://github.com/KTelyuk/ai-for-developers-project-387/commit/da97bc62ce9fc7e20b2ee45140a7e6345140ba97))
* повтор при сетевых ошибках и закреплённые кнопки шагов на телефоне ([e7bfef1](https://github.com/KTelyuk/ai-for-developers-project-387/commit/e7bfef14f1c7f98f556d4df27736b1e4b2045a94))
* бэкенд раздаёт собранный фронтенд, есть Docker-образ ([6549ee4](https://github.com/KTelyuk/ai-for-developers-project-387/commit/6549ee4439df0565a2f69a47f34260e304f2c59e))
* демо на Render стартует с осмысленными типами встреч ([58ca468](https://github.com/KTelyuk/ai-for-developers-project-387/commit/58ca46810a555c5b2827a30f18f6b78f884bdcdb))
* подпись «Время указано по Алматы (UTC+5)» везде в интерфейсе ([#8](https://github.com/KTelyuk/ai-for-developers-project-387/issues/8)) ([47631d9](https://github.com/KTelyuk/ai-for-developers-project-387/commit/47631d93cc5042a6480bb1c4ff242d3b7030b84a))


### Bug Fixes

* длина имени гостя проверяется после обрезки пробелов ([6321e51](https://github.com/KTelyuk/ai-for-developers-project-387/commit/6321e51f9c77c90813fa4d7c0417c78c741e27f6))
* окно записи сдвигается при смене даты в Алматы ([7e851c9](https://github.com/KTelyuk/ai-for-developers-project-387/commit/7e851c90c126b6721ea07dd61acd8bdb7bf633d3))
* /admin перенаправляет, неизвестные пути показывают страницу «не найдено» ([9ee1f28](https://github.com/KTelyuk/ai-for-developers-project-387/commit/9ee1f28fc95f4bb1e4d5c8d97c387fa999b4118b))
* после изменения записи сразу видно новое время ([bda8e89](https://github.com/KTelyuk/ai-for-developers-project-387/commit/bda8e89b878ecf6f065d294a347c82f012990afc))
* логотип в разделе владельца ведёт на /admin ([76ded60](https://github.com/KTelyuk/ai-for-developers-project-387/commit/76ded600a660dd731bcf30e35039d4b8d90d4b4c))
* имя и email гостя сохраняются после «Другое время» ([fd08596](https://github.com/KTelyuk/ai-for-developers-project-387/commit/fd0859621651879668dc4ac591518f2242735ce0))
