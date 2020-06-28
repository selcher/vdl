#!/usr/bin/env node

const log = console.log;
const msg = require('./src/messages');
const info = require('./src/info');

/**
 * Tasks
 */
let tasks = {};

/**
 * Task: Initialize command-line interface
 */
const terminal = require('./src/terminal');
const package = require('./package.json');
const name = package.name;
const version = package.version;
const siteUrl = package.repository.url.replace(/(git\+|\.git)/g, '');

tasks.init = () => (
  terminal.init({
    name,
    version,
    usage: msg.usage,
    help: () => {
      log(msg.examples(name, siteUrl));
    }
  })
);

/**
 * Task: Close command-line interface
 */
tasks.done = () => {
  log(msg.done);
  terminal.close();
};

/**
 * Task: Download Video From Url
 */
const vid = require('./src/video');
const downloadProgressLogger = (downloaded, total) => {
  terminal.writeLine(msg.progress(downloaded, total));

  if (downloaded === total) {
    terminal.clearLine();
  }
};
const downloadErrorHandler = (err) => {
  if (!err) {
    return;
  }

  if (program.error) {
    log(msg.downloadFailed(err));
  }
  else {
    log(msg.errDownloading);
  }
};
const downloadFromUrl = (url) => {
  log(msg.getInfo(url));

  return vid.getInfo(url)
    .then(videoInfo => {
      if (videoInfo.error) {
        log(videoInfo.error);
      }

      log(msg.downloading(info.getFileName(videoInfo)));

      return vid.downloadFromInfo(videoInfo);
    })
    .catch((err) => {
      downloadErrorHandler(err);

      log(msg.downloading(url));

      return vid.fallbackDownloadFromUrl(url);
    });
};

tasks.downloadFromUrl = (url) => {
  vid.setProgressLogger(downloadProgressLogger);

  downloadFromUrl(url)
    .then(videoDownloadedMsg => log(videoDownloadedMsg))
    .catch((err) => downloadErrorHandler(err))
    .finally(tasks.done);
};

/**
 * Task: Download Videos Listed in File
 */
const fs = require('fs');
const getFileContentAsList = (pathToFile) => {
  const newLineChars = /\r\n/g;
  const invalidChars = /\t\r\n\v\f/g;
  const content = fs.readFileSync(pathToFile, 'utf-8');
  let fileContentList = content.replace(newLineChars, '\n')
    .split('\n')
    .map(url => url ? url.replace(invalidChars, '') : '')
    .filter(url => url);

  return fileContentList;
};

tasks.downloadFromFile = (filePath) => {
  log(msg.readFile(filePath));

  const contentList = getFileContentAsList(filePath);
  const totalItems = contentList.length;

  log(msg.itemsFound(totalItems));

  if (totalItems === 0) {
    tasks.done();
    return;
  }

  const logCurrentItemOfTotalItems = ((total) => {
    let counter = 1;

    return (
      () =>  { log(msg.itemOfTotal(counter++, total)); }
    );
  })(totalItems);

  const searchAndDownload = (url) => {
    logCurrentItemOfTotalItems();

    let searchDone = null;

    if (!url) {
      searchDone = Promise.reject(msg.invalidUrl(url));
    }
    else if (!vid.isValidUrl(url)) {
      // If the suffix doesn't start with 'http',
      // assume it's a search.
      searchDone = (
        vid.searchInfo(url)
          .then(searchResult => downloadFromUrl(searchResult.url))
      );
    }
    else {
        searchDone = downloadFromUrl(url);
    }

    searchDone
      .then(videoDownloadedMsg => log(videoDownloadedMsg))
      .then(downloadNextInFile)
      .catch(downloadNextInFile);
  };

  const downloadNextInFile = (err) => {
    downloadErrorHandler(err);

    const nextUrl = contentList.shift();

    if (nextUrl) {
      searchAndDownload(nextUrl);
    }
    else {
      tasks.done();
    }
  };

  vid.setProgressLogger(downloadProgressLogger);

  searchAndDownload(contentList.shift());
};

/**
 * Execute command
 */

let commandFound = false;

const onCommandFound = () => {
  commandFound = true;
};

log(msg.about(name, version));

const program = tasks.init();

if (program.lang) {
  vid.setLanguage(program.lang);
}

if (program.url) {
  onCommandFound();
  tasks.downloadFromUrl(program.url);
}

if (program.file) {
  onCommandFound();
  tasks.downloadFromFile(program.file);
}

if (!commandFound) {
  log(msg.commandNotFound(name));
  terminal.close();
}
