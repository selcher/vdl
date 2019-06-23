#!/usr/bin/env node

const log = console.log;
const msg = require('./src/messages');

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

tasks.init = () => (
    terminal.init({
        name,
        version,
        usage: msg.usage,
        help: () => {
            log(msg.examples(name));
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

tasks.downloadFromUrl = (url) => {
    vid.downloadFromUrl(url)
        .then(videoDownloadedMsg => log(videoDownloadedMsg))
        .catch((err) => {
            if (program.error) {
                log(msg.downloadFailed(err));
            }
            else {
                log(msg.errDownloading);
            }
        })
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
            () => {
                log(
                    msg.itemOfTotal(counter++, total)
                );
            }
        );
    })(totalItems);

    const searchAndDownload = (url) => {
        logCurrentItemOfTotalItems();

        let searchDone = null;

        if (!url) {
            searchDone = Promise.reject(msg.invalidUrl);
        }
        else if (!vid.isValidUrl(url)) {
            // If the suffix doesn't start with 'http',
            // assume it's a search.
            searchDone = vid.downloadFromKeyword(url);
        }
        else {
            searchDone = vid.downloadFromUrl(url);
        }

        searchDone
            .then(videoDownloadedMsg => log(videoDownloadedMsg))
            .then(downloadNextInFile)
            .catch(downloadNextInFile);
    };

    const downloadNextInFile = (err) => {
        if (err) {
            log(err);
        }

        const nextUrl = contentList.shift();

        if (nextUrl) {
            searchAndDownload(nextUrl);
        }
        else {
            tasks.done();
        }
    };

    searchAndDownload(contentList.shift());
};

/**
 * Execute command
 */

let commandFound = false;

const onCommandFound = () => {
    commandFound = true;
    log(msg.about(name));
};

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
    log(msg.about(name));
    log(msg.commandNotFound(name));
    close();
}
