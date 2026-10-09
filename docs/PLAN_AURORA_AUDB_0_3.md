# Интеграция audb 0.3 в claude-in-mobile

Согласованный минимальный объём: актуализировать `feat/aurora-audb-migration`
на upstream 4.4.1 и подключить телефон/эмулятор через существующие CLI, skills
и MCP интерфейсы. Версия audb — ^0.3.0 (0.3.x), публичный JSON schemaVersion 1.
История ветки сохраняется merge-коммитом; main и версии проекта не меняются.

1. Обновить ветку на upstream `7ed83cc`, сохранить Android/iOS/HarmonyOS поведение
   и новые capability-интерфейсы. Отложить старые sensor/perf/sandbox расширения.
2. Обновить Rust/TypeScript клиенты: PATH **перед** AUDB_PATH, проверка версии,
   argv без host shell, JSON success/error даже при nonzero exit, сохранение
   кода ошибки и partial metadata. Ограничить время/объём, не повторять действия.
3. Передавать конкретный ID каждой операции, брать audb default только при
   отсутствии выбранной/явной цели. Выбор MCP локальный, без `audb select`;
   неизвестный ID не заменять другим устройством. Сохранять registry unknown.
4. Подключить tap/double tap/long press/swipe, UTF-8 stdin, native keys,
   screenshot/compression и масштабирование по реальному PNG. UI tree явно
   unsupported. Подключить приложения/RPM, файлы и диагностику.
5. Добавить PermissionAdapter и существующие CLI grant/revoke/reset. Полный
   CLI доступ: `aurora --device ID permission ...`, status/doctor/capabilities.
   MCP system: list/grant/grant-all/revoke/reset/prompt; disablePrompt только
   явно, grant-all только declared permissions. Регистрация и установка агента
   остаются явными командами audb, без автоматической установки/паролей.
6. Обновить существующий skill и справки. Проверить TypeScript build/typecheck,
   Vitest, Rust tests/format/Clippy, контрактные тесты ошибок и двух целей.
   Проверить одноразовый fixture на телефоне и VM через CLI и MCP, затем удалить.
7. Закоммитить и отправить feature-ветку обычным push, без release claude-in-mobile.

Пользовательская справка: [Aurora](../cli/plugin/skills/mcp-devices/references/aurora.md).
Ввод дерева UI, подмена GPS/датчиков и расширенные emulator-инструменты не входят
в эту интеграцию. Они могут добавляться позднее через capabilities audb.

## Результат проверки, 9 октября 2026

Реализовано на базе upstream 4.4.1: npm build/typecheck, 1508 Vitest tests и
238 Rust tests проходят. Rustfmt проверен для изменённых файлов; Clippy проходит
с предупреждениями в существующем коде. Skill валиден; установщик включает
новую справку Aurora. Контрактные тесты проверяют PATH/fallback, две цели,
UTF-8 stdin, PNG scaling, nonzero errors, потерю ответа и отсутствие повторов.

На KVADRA/Aurora 5.2.0 и VM/Aurora 5.2.1 проверены native CLI, MCP обработчики
и настоящий MCP stdio: сжатые скриншоты, точный read-back Unicode в fixture,
тачи, клавиши и свайпы, бинарные файлы, shell newlines, app inventory, повторная
установка changed=false и Sailjail permissions. У VM fixture объявляет UserDirs;
телефонный fixture не объявляет разрешений, поэтому его grant-all — пустой набор.
Prompt и grants проверены на обеих целях. После проверки prompt восстановлен,
fixture остановлен и удалён; бинарники и desktop entries отсутствуют. Default
audb остался emulator. Локальные артефакты: cli/target/aurora-evidence (ignored).

После исправлений review: 1522 Vitest tests и 237 Rust tests из CI проходят.
Версия внешнего audb API закреплена в package.json Aurora-плагина как ^0.3.0;
TypeScript и Rust строго проверяют одинаковый диапазон стабильных версий.
В CI добавлен aurora_cli. Уязвимые npm-зависимости обновлены отдельным изменением;
lockfile пересобран без старого node_modules, сохранены 8 Linux sharp-веток.
Чистый npm ci, production audit (0 vulnerabilities), runtime --help и Browser ESM
import проходят. Это локальные результаты; GitHub CI запущен на новом PR #85: GitHub отклонил reopening #49.

Root на телефоне настроен через явный setup-root в исходной сборке audb: отдельная
SSH identity для этого устройства, одноразовый devel-su пароль, проверка UID 0
и обычного пользователя перед сохранением registry. sshd policy не изменялась.
CLI --root и MCP root:true выполняют root SSH; оба отклоняют root на других
платформах. Настоящий MCP stdio и CLI подтвердили UID 0 на телефоне/эмуляторе,
UID 100000 без root, рабочие скриншоты и неизменный audb default emulator.
Повторный setup-root вернул changed=false без пароля. Сама команда setup-root
ещё не входит в опубликованный audb 0.3.0; исходная ревизия указана в справке.
Проверка интеграции выполнена с опубликованным audb 0.3.0 в PATH процесса.

Локальный audb в PATH обновлён исходной сборкой с setup-root; новый audb release
не публиковался. Root runtime API совместим с опубликованным 0.3.0.
