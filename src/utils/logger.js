// Minimal structured logger. Never logs secrets - callers must not pass
// API keys / tokens as arguments.

const SENSITIVE_KEY_PATTERN = /(api[_-]?key|token|secret|password|authorization)/i;

function redact(value) {
  if (value && typeof value === 'object') {
    const clone = Array.isArray(value) ? [] : {};
    for (const [k, v] of Object.entries(value)) {
      clone[k] = SENSITIVE_KEY_PATTERN.test(k) ? '[REDACTED]' : redact(v);
    }
    return clone;
  }
  return value;
}

function timestamp() {
  return new Date().toISOString();
}

function format(level, tag, message, meta) {
  const base = `[${timestamp()}] ${level} [${tag}] ${message}`;
  if (meta !== undefined) {
    try {
      return `${base} ${JSON.stringify(redact(meta))}`;
    } catch {
      return base;
    }
  }
  return base;
}

function makeLogger(tag) {
  return {
    info: (message, meta) => console.log(format('INFO', tag, message, meta)),
    warn: (message, meta) => console.warn(format('WARN', tag, message, meta)),
    error: (message, meta) => console.error(format('ERROR', tag, message, meta)),
    debug: (message, meta) => {
      if (process.env.DEBUG) console.debug(format('DEBUG', tag, message, meta));
    },
  };
}

module.exports = { makeLogger };
