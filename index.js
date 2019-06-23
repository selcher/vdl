#!/usr/bin/env node

const package = require('./package.json');
const name = package.name;
const version = package.version;

const process = require('process');
const terminal = require('./src/terminal');

const log = console.log;
const msg = require('./src/messages');
const done = () => {
    log(msg.done);
    terminal.close();
};

const vid = require('./src/video');
const fs = require('fs');

const program = require('commander');

/**
 * Terminal command definitions
 */

program
    .name(name)
    .version(version, '-v, --version')
    .usage(msg.usage)
    .option('-u, --url [urlpath]', 'Specify video url')
    .option('-f, --file [filepath]', 'Specify file location')
    .option('-l, --lang [name]', 'Set language')
    .option('-e, --error', 'Display error details')
    .on('--help', () => {
        log(msg.examples(name));
    })
    .parse(process.argv);

let commandFound = false;

const onCommandFound = () => {
    commandFound = true;
    log(msg.about(name));
};

if (program.lang) {
    vid.setLanguage(program.lang);
}

if (program.url) {
    onCommandFound();

    vid.downloadFromUrl(program.url)
        .then(videoDownloadedMsg => log(videoDownloadedMsg))
        .catch((err) => {
            if (program.error) {
                log(msg.downloadFailed(err));
            }
            else {
                log(msg.errDownloading);
            }
        })
        .finally(done);
}

if (program.file) {
    onCommandFound();

    const filePath = program.file;

    log(msg.readFile(filePath));

    const getFileContentAsList = pathToFile => {
        const newLineChars = /\r\n/g;
        const invalidChars = /\t\r\n\v\f/g;
        const content = fs.readFileSync(pathToFile, 'utf-8');
        let fileContentList = content.replace(newLineChars, '\n')
            .split('\n')
            .map(url => url ? url.replace(invalidChars, '') : '')
            .filter(url => url);

        return fileContentList;
    };

    const contentList = getFileContentAsList(filePath);
    const totalItems = contentList.length;

    log(msg.itemsFound(totalItems));

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
            done();
        }
    };

    if (totalItems) {
        searchAndDownload(contentList.shift());
    }
    else {
        done();
    }
}

if (!commandFound) {
    log(msg.about(name));
    log(msg.commandNotFound(name));
    close();
}
