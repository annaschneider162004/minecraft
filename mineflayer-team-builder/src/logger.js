const formatTime = () => new Date().toISOString();

function createLogger(scope) {
  const prefix = `[${scope}]`;

  function write(level, message) {
    const line = `${formatTime()} ${level} ${prefix} ${message}`;
    if (level === "ERROR") {
      console.error(line);
      return;
    }
    console.log(line);
  }

  return {
    info(message) {
      write("INFO", message);
    },
    warn(message) {
      write("WARN", message);
    },
    error(message) {
      write("ERROR", message);
    },
  };
}

module.exports = {
  createLogger,
};
