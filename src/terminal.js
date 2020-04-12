#!/usr/bin/env node

const process = require('process');
const readline = require('readline');
const program = require('commander');

/**
 * Command Definitions
 */

function init(options) {
  program
    .name(options.name)
    .version(options.version, '-v, --version')
    .usage(options.usage)
    .option('-u, --url [urlpath]', 'specify video url')
    .option('-f, --file [filepath]', 'specify file location')
    .option('-l, --lang [name]', 'set language')
    .option('-e, --error', 'display error details')
    .on('--help', options.help)
    .parse(process.argv);

  return program;
}

/**
 * Input Output Functions
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('close', () => {
  process.exit(0);
});

const writeLine = (txt) => {
  readline.cursorTo(process.stdout, 0);
  readline.clearLine(process.stdout, 0);
  process.stdout.write(txt);
  process.stdout.pause();
};

const clearLine = () => {
  readline.cursorTo(process.stdout, 0, null);
  readline.clearLine(process.stdout, 0);
};

const close = () => rl.close();

module.exports = {
  init,
  writeLine,
  clearLine,
  close
};
