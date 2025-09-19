import dotenv from "dotenv";

dotenv.config();

type LogLevelName = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

type LogLevelMap = Record<LogLevelName, number>;

const LEVELS: LogLevelMap = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_LEVEL: LogLevelName = "debug";

function normalizeLevelName(rawLevel: string | undefined): LogLevelName {
  if (!rawLevel) {
    return DEFAULT_LEVEL;
  }

  switch (rawLevel.toLowerCase()) {
    case "debug":
      return "debug";
    case "info":
      return "info";
    case "warn":
    case "warning":
      return "warn";
    case "error":
      return "error";
    default:
      return DEFAULT_LEVEL;
  }
}

const configuredLevel = normalizeLevelName(process.env.LOG_LEVEL);

function shouldLog(level: LogLevelName): boolean {
  return LEVELS[level] >= LEVELS[configuredLevel];
}

function normalizeContext(context?: LogContext): LogContext | undefined {
  if (!context) {
    return undefined;
  }

  const normalizedEntries = Object.entries(context).map(([key, value]) => {
    if (value instanceof Error) {
      return [key, { message: value.message, stack: value.stack }];
    }

    return [key, value];
  });

  if (normalizedEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(normalizedEntries);
}

function output(level: LogLevelName, message: string, context?: LogContext): void {
  if (!shouldLog(level)) {
    return;
  }

  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
  };

  const normalizedContext = normalizeContext(context);
  if (normalizedContext) {
    entry.context = normalizedContext;
  }

  const serialized = JSON.stringify(entry);

  switch (level) {
    case "warn":
      console.warn(serialized);
      break;
    case "error":
      console.error(serialized);
      break;
    case "info":
    case "debug":
    default:
      console.log(serialized);
      break;
  }
}

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  level: LogLevelName;
}

export const logger: Logger = {
  debug: (message, context) => output("debug", message, context),
  info: (message, context) => output("info", message, context),
  warn: (message, context) => output("warn", message, context),
  error: (message, context) => output("error", message, context),
  level: configuredLevel,
};
