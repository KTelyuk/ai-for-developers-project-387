# Changelog

## [0.2.0](https://github.com/KTelyuk/ai-for-developers-project-387/compare/v0.1.0...v0.2.0) (2026-11-22)


### Features

* 14-day availability calendar with free slot counts ([#7](https://github.com/KTelyuk/ai-for-developers-project-387/issues/7)) ([2cd6369](https://github.com/KTelyuk/ai-for-developers-project-387/commit/2cd6369c9d51b0dcb717c54bf1964a195dcb4799))
* add application scaffold with checks and CI ([6f5b0b2](https://github.com/KTelyuk/ai-for-developers-project-387/commit/6f5b0b226484ce7a1a7c62c8882763d704da1e4a))
* add home page and booking placeholder ([89ede84](https://github.com/KTelyuk/ai-for-developers-project-387/commit/89ede8433e92d1b7b08816792b1603f40d294ace))
* book a slot and get the booking link ([#8](https://github.com/KTelyuk/ai-for-developers-project-387/issues/8)) ([16e7b16](https://github.com/KTelyuk/ai-for-developers-project-387/commit/16e7b169e66e2cd11ebc9293bdbde368695c2d8f))
* clock, in-memory store, unified errors, MSW and coverage ([#3](https://github.com/KTelyuk/ai-for-developers-project-387/issues/3)) ([cf4217b](https://github.com/KTelyuk/ai-for-developers-project-387/commit/cf4217b2849cd7bc3f44baaa2761c645e128ba36))
* day slots for a chosen event type ([#6](https://github.com/KTelyuk/ai-for-developers-project-387/issues/6)) ([b8c0d04](https://github.com/KTelyuk/ai-for-developers-project-387/commit/b8c0d041f254583b4e1bb0e8b1f2f3ec1716f44b))
* edit event types from the owner list ([#5](https://github.com/KTelyuk/ai-for-developers-project-387/issues/5)) ([bf6bc28](https://github.com/KTelyuk/ai-for-developers-project-387/commit/bf6bc280b9c503791a5032bce11142e2edfbb9ef))
* event types for owner and guest ([#4](https://github.com/KTelyuk/ai-for-developers-project-387/issues/4)) ([acd233e](https://github.com/KTelyuk/ai-for-developers-project-387/commit/acd233e260e5c4a3060d7bb59b646bd10aef8135))
* guest booking page and cancel by link ([#10](https://github.com/KTelyuk/ai-for-developers-project-387/issues/10)) ([ef3209a](https://github.com/KTelyuk/ai-for-developers-project-387/commit/ef3209aeb364a2693e107d8b18493ff3d4145074))
* guest edits their booking by link ([#27](https://github.com/KTelyuk/ai-for-developers-project-387/issues/27)) ([6ae1f20](https://github.com/KTelyuk/ai-for-developers-project-387/commit/6ae1f2036fd7417eda9eeeef735e48580fb691da))
* keep guest data after a booking conflict ([#9](https://github.com/KTelyuk/ai-for-developers-project-387/issues/9)) ([520c38f](https://github.com/KTelyuk/ai-for-developers-project-387/commit/520c38fd69a650149eb39ff8597f2a0feda2d39e))
* owner bookings list and cancel ([#11](https://github.com/KTelyuk/ai-for-developers-project-387/issues/11)) ([da97bc6](https://github.com/KTelyuk/ai-for-developers-project-387/commit/da97bc62ce9fc7e20b2ee45140a7e6345140ba97))
* retry on network errors and pinned phone step buttons ([#12](https://github.com/KTelyuk/ai-for-developers-project-387/issues/12)) ([e7bfef1](https://github.com/KTelyuk/ai-for-developers-project-387/commit/e7bfef14f1c7f98f556d4df27736b1e4b2045a94))
* serve built frontend and ship a Docker image ([#13](https://github.com/KTelyuk/ai-for-developers-project-387/issues/13)) ([6549ee4](https://github.com/KTelyuk/ai-for-developers-project-387/commit/6549ee4439df0565a2f69a47f34260e304f2c59e))
* главная страница и заглушка бронирования ([4cbf91c](https://github.com/KTelyuk/ai-for-developers-project-387/commit/4cbf91c2c8080214570b3e28e0646f2acc52c2e6))
* гость изменяет свою запись по ссылке ([#27](https://github.com/KTelyuk/ai-for-developers-project-387/issues/27)) ([5ff44d3](https://github.com/KTelyuk/ai-for-developers-project-387/commit/5ff44d390671e366baccfbe664f165fa0a696319))
* демо на Render стартует с осмысленными типами встреч ([5be9720](https://github.com/KTelyuk/ai-for-developers-project-387/commit/5be9720a666b6dd613feb147c1d4483592805267))
* демо на Render стартует с осмысленными типами встреч ([58ca468](https://github.com/KTelyuk/ai-for-developers-project-387/commit/58ca46810a555c5b2827a30f18f6b78f884bdcdb))
* подпись «Время указано по Алматы (UTC+5)» везде в интерфейсе ([#8](https://github.com/KTelyuk/ai-for-developers-project-387/issues/8)) ([12cba55](https://github.com/KTelyuk/ai-for-developers-project-387/commit/12cba55525815710f62d08a55afeb26669810958))
* подпись «Время указано по Алматы (UTC+5)» везде в интерфейсе ([#8](https://github.com/KTelyuk/ai-for-developers-project-387/issues/8)) ([47631d9](https://github.com/KTelyuk/ai-for-developers-project-387/commit/47631d93cc5042a6480bb1c4ff242d3b7030b84a))
* сервис записи на звонок по спецификации ([44b44ae](https://github.com/KTelyuk/ai-for-developers-project-387/commit/44b44aed491d80773330e08d393f15d37571f3f4))


### Bug Fixes

* check guest name length after trimming ([#8](https://github.com/KTelyuk/ai-for-developers-project-387/issues/8)) ([6321e51](https://github.com/KTelyuk/ai-for-developers-project-387/commit/6321e51f9c77c90813fa4d7c0417c78c741e27f6))
* keep guest name and email after choosing another time ([#30](https://github.com/KTelyuk/ai-for-developers-project-387/issues/30)) ([fd08596](https://github.com/KTelyuk/ai-for-developers-project-387/commit/fd0859621651879668dc4ac591518f2242735ce0))
* logo in the owner section leads to /admin, not the guest home ([#29](https://github.com/KTelyuk/ai-for-developers-project-387/issues/29)) ([76ded60](https://github.com/KTelyuk/ai-for-developers-project-387/commit/76ded600a660dd731bcf30e35039d4b8d90d4b4c))
* move the booking window when the Almaty date changes ([#7](https://github.com/KTelyuk/ai-for-developers-project-387/issues/7)) ([7e851c9](https://github.com/KTelyuk/ai-for-developers-project-387/commit/7e851c90c126b6721ea07dd61acd8bdb7bf633d3))
* redirect /admin and show a not-found page for unknown paths ([#4](https://github.com/KTelyuk/ai-for-developers-project-387/issues/4)) ([9ee1f28](https://github.com/KTelyuk/ai-for-developers-project-387/commit/9ee1f28fc95f4bb1e4d5c8d97c387fa999b4118b))
* show the saved booking right after editing it ([#27](https://github.com/KTelyuk/ai-for-developers-project-387/issues/27)) ([bda8e89](https://github.com/KTelyuk/ai-for-developers-project-387/commit/bda8e89b878ecf6f065d294a347c82f012990afc))
* show the saved booking right after editing it ([#27](https://github.com/KTelyuk/ai-for-developers-project-387/issues/27)) ([41e9a18](https://github.com/KTelyuk/ai-for-developers-project-387/commit/41e9a189927a2dd80e63a1bfddc19e276467965e))
* имя и email гостя сохраняются после «Другое время» ([#30](https://github.com/KTelyuk/ai-for-developers-project-387/issues/30)) ([6c67cf6](https://github.com/KTelyuk/ai-for-developers-project-387/commit/6c67cf62ae88c34b6fe8c9f3de360ef06b6b0f57))
* логотип в разделе владельца ведёт на /admin ([#29](https://github.com/KTelyuk/ai-for-developers-project-387/issues/29)) ([7f0e888](https://github.com/KTelyuk/ai-for-developers-project-387/commit/7f0e88824092c361eda0b7cc2687cd3fc434bc88))
* после изменения записи сразу видно новое время ([#27](https://github.com/KTelyuk/ai-for-developers-project-387/issues/27)) ([ff44941](https://github.com/KTelyuk/ai-for-developers-project-387/commit/ff4494158d2687633338b944d2754357487e4235))
