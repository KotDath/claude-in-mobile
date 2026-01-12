# Desktop Target Specification for claude-in-mobile

## Overview

Добавление desktop-таргета через Kotlin Multiplatform (Compose Desktop) для автоматизированного тестирования UI приложений на десктопных платформах.

## Целевые платформы

| Платформа | Приоритет | Accessibility API |
|-----------|-----------|-------------------|
| macOS | 1 (первый) | AXUIElement |
| Windows | 2 | UI Automation (UIA) |
| Linux | 3 | AT-SPI2 |

## Архитектура

### Взаимодействие компонентов

```
┌─────────────────┐     stdin/stdout      ┌──────────────────────┐
│   MCP Server    │ ◄──────────────────► │  Desktop App         │
│   (Node.js)     │      JSON-RPC         │  (Compose Desktop)   │
└────────┬────────┘                       └──────────────────────┘
         │
         │  set_target('desktop')
         │
┌────────▼────────┐
│   ADB Client    │ (для Android, параллельно)
└─────────────────┘
```

### Запуск Desktop-приложения

MCP-сервер запускает desktop-app как child process через Gradle:
- Команда: `./gradlew :desktopApp:run` или `:composeApp:desktopRun`
- Автодетект подходящего таска в проекте
- Поддержка кастомных JVM-аргументов и переменных окружения

## MCP Tools API

### Управление таргетами

```typescript
// Переключение активного таргета
set_target(target: 'desktop' | 'android'): void

// Получение текущего таргета
get_target(): { target: string, status: 'running' | 'stopped' }
```

### Запуск приложения

```typescript
launch_desktop_app(params: {
  projectPath: string;           // Путь к Gradle-проекту
  task?: string;                 // Gradle-таск (автодетект если не указан)
  jvmArgs?: string[];            // JVM аргументы
  env?: Record<string, string>;  // Переменные окружения
}): { success: boolean, pid: number }
```

### Input-операции

```typescript
// Тап/клик по координатам
tap(x: number, y: number): void

// Свайп/drag
swipe(startX: number, startY: number, endX: number, endY: number, durationMs?: number): void

// Ввод текста
type_text(text: string): void

// Нажатие клавиш
key_event(key: string, modifiers?: string[]): void
// Примеры: key_event('Enter'), key_event('a', ['ctrl'])
```

### UI Hierarchy

```typescript
get_ui_hierarchy(): {
  windows: Window[];
}

interface Window {
  id: string;
  title: string;
  bounds: Bounds;
  focused: boolean;
  elements: UIElement[];
}

interface UIElement {
  // Унифицированный формат (совпадает с Android)
  id?: string;
  text?: string;
  contentDescription?: string;
  className: string;
  bounds: Bounds;
  clickable: boolean;
  enabled: boolean;
  focused: boolean;
  children: UIElement[];
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### Скриншоты

```typescript
screenshot(params?: {
  windowId?: string;    // Конкретное окно (по умолчанию: focused)
  quality?: number;     // JPEG quality 0-100 (по умолчанию: 80)
}): {
  base64: string;       // JPEG в base64
  width: number;
  height: number;
  scaleFactor: number;  // HiDPI scale factor
}
```

### Информация об окнах

```typescript
get_window_info(): {
  windows: Array<{
    id: string;
    title: string;
    bounds: Bounds;
    focused: boolean;
    minimized: boolean;
    fullscreen: boolean;
  }>;
  activeWindowId: string;
}

resize_window(params: {
  windowId?: string;
  width: number;
  height: number;
}): void

focus_window(windowId: string): void
```

### Clipboard

```typescript
get_clipboard(): { text: string }
set_clipboard(text: string): void
```

### File Dialogs

```typescript
// Отслеживание открытия file dialog
on_file_dialog(): Promise<{ type: 'open' | 'save', path?: string }>

// Автоматический выбор файла в диалоге
select_file(path: string): void
```

### Логи

```typescript
get_logs(params?: {
  type?: 'stdout' | 'stderr' | 'compose' | 'crash' | 'all';
  since?: number;  // timestamp
  limit?: number;
}): {
  logs: Array<{
    timestamp: number;
    type: string;
    message: string;
  }>;
}

get_performance_metrics(): {
  fps: number;
  memoryUsageMb: number;
  cpuPercent: number;
}
```

## Технические детали

### Input Injection

- **java.awt.Robot** для синтетического input (клики, клавиатура)
- **OS Accessibility API** для получения UI-дерева:
  - macOS: AXUIElement через JNI/JNA
  - Windows: UI Automation через JNA
  - Linux: AT-SPI2 через D-Bus

### Fallback стратегия

Если элемент не найден через Accessibility API:
1. Использовать координатный клик
2. Сообщить в ответе что элемент найден по координатам, не по semantics

### HiDPI/Retina поддержка

- Автодетект scale factor через `GraphicsEnvironment`
- Все координаты в API — логические (1x)
- Внутренняя конвертация в физические координаты
- Скриншоты возвращают `scaleFactor` для информации

### Permissions (macOS)

При отсутствии Accessibility permissions:
1. Показать инструкцию пользователю
2. Автоматически открыть System Preferences > Security & Privacy > Accessibility
3. Вернуть ошибку с подробным описанием

```typescript
{
  error: 'ACCESSIBILITY_PERMISSION_REQUIRED',
  message: 'Accessibility permission required. Opening System Preferences...',
  instructions: [
    '1. Click the lock to make changes',
    '2. Enable access for Terminal/IDE',
    '3. Restart the MCP server'
  ]
}
```

### Crash Handling

При падении desktop-app:
1. Сохранить crash stacktrace
2. Автоматически перезапустить приложение
3. Вернуть информацию о crash через `get_logs(type: 'crash')`

### Multi-window поддержка

- Список всех окон процесса через `get_window_info()`
- Фокус на конкретное окно через `focus_window()`
- Работа с диалогами и popup как с отдельными окнами
- `screenshot(windowId)` для скриншота конкретного окна

## Performance Requirements

| Операция | Target Latency |
|----------|----------------|
| screenshot | < 300ms |
| get_ui_hierarchy | < 500ms |
| tap/click | < 50ms |
| type_text | < 100ms |

## Фичи на будущее (v2+)

- [ ] Запись видео/GIF действий
- [ ] Drag-and-drop эмуляция
- [ ] System tray взаимодействие
- [ ] Запуск из JAR (без Gradle)
- [ ] Native меню поддержка

## Зависимости

### Kotlin/JVM
- Compose Desktop 1.5+
- JNA (для OS APIs)
- kotlinx.serialization (JSON-RPC)

### Node.js (MCP Server)
- Существующий код из claude-in-mobile
- child_process для управления desktop-app

## Структура файлов

```
claude-in-mobile/
├── src/
│   ├── desktop/
│   │   ├── client.ts          # Desktop client (аналог adb/client.ts)
│   │   ├── accessibility/
│   │   │   ├── macos.ts       # AXUIElement bindings
│   │   │   ├── windows.ts     # UI Automation bindings
│   │   │   └── linux.ts       # AT-SPI2 bindings
│   │   ├── input.ts           # Robot-based input
│   │   └── gradle.ts          # Gradle task detection & launch
│   └── tools/
│       └── desktop-tools.ts   # MCP tool definitions
└── docs/
    └── SPEC_DESKTOP.md        # This file
```

## Open Questions

1. **Compose Semantics экспорт**: Насколько полно Compose Desktop экспортирует Semantics в OS Accessibility API? Требуется исследование.

2. **Linux поддержка**: AT-SPI2 может работать нестабильно в некоторых дистрибутивах. Возможно потребуется fallback на Robot-only режим.

3. **Native диалоги**: File dialogs на каждой ОС выглядят по-разному и могут не экспортировать accessibility. Возможно потребуется platform-specific код.

---

*Спецификация создана: 2026-01-12*
*Версия: 1.0*
