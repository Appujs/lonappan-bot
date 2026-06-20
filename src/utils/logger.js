const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m'
};

class Logger {
  static getTimestamp() {
    const now = new Date();
    return `${colors.gray}[${now.toISOString().replace('T', ' ').substring(0, 19)}]${colors.reset}`;
  }

  static system(message) {
    console.log(`${this.getTimestamp()} ${colors.bold}${colors.brightBlue}[SYSTEM]${colors.reset} ${message}`);
  }

  static db(message) {
    console.log(`${this.getTimestamp()} ${colors.bold}${colors.brightGreen}[DATABASE]${colors.reset} ${message}`);
  }

  static command(message) {
    console.log(`${this.getTimestamp()} ${colors.bold}${colors.brightMagenta}[COMMAND]${colors.reset} ${message}`);
  }

  static event(message) {
    console.log(`${this.getTimestamp()} ${colors.bold}${colors.brightCyan}[EVENT]${colors.reset} ${message}`);
  }

  static info(message) {
    console.log(`${this.getTimestamp()} ${colors.bold}${colors.white}[INFO]${colors.reset} ${message}`);
  }

  static warn(message) {
    console.warn(`${this.getTimestamp()} ${colors.bold}${colors.brightYellow}[WARN]${colors.reset} ${message}`);
  }

  static error(message, stack = '') {
    console.error(`${this.getTimestamp()} ${colors.bold}${colors.brightRed}[ERROR]${colors.reset} ${message}`);
    if (stack) {
      console.error(`${colors.red}${stack}${colors.reset}`);
    }
  }
}

module.exports = Logger;
