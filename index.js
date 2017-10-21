#!/usr/bin/env node

const package = require('./package.json');
const process = require('process');
const fs = require('fs');
const readline = require('readline');
const program = require('commander');
const chalk = require('chalk');
const ytdl = require('ytdl-core');
const youtubedl = require('youtube-dl');
const translate = require('translate-google');

const version = package.version;
const currentDir = process.cwd();
const log = console.log;

/**
 * Messages
 */

const extension = 'mp4';
const msg = {
    about: [
        chalk.dim(` VDL - ${version}`)
    ].join(' '),
    invalidUrl: (url) => [
            chalk.red(' !'),
            chalk.yellow('Please provide a valid url:'),
            chalk.dim(url)
        ].join(' '),
    getInfo: (url) => [
            chalk.blue(' +'),
            chalk.white('Getting info:'),
            chalk.dim(url)
        ].join(' '),
    errGetInfo: (url) => [
            chalk.red(' ✖'),
            chalk.yellow('Error getting video info:'),
            chalk.dim(url)
        ].join(' '),
    searchInfo: (keyword) => [
            chalk.blue(' +'),
            chalk.white('Searching video info:'),
            chalk.dim(keyword)
        ].join(' '),
    errSearchInfo: (keyword) => [
            chalk.red(' ✖'),
            chalk.yellow('Error searching video info:'),
            chalk.dim(keyword)
        ].join(' '),
    errTranslateTitle: [
            chalk.red(' !'),
            chalk.yellow('Error translating video title'),
            chalk.red('\n !'),
            chalk.yellow('Using original title')
        ].join(' '),
    downloading: (title) => [
            chalk.blue(' +'),
            chalk.white('Downloading:'),
            chalk.dim(`${title}.${extension}`)
        ].join(' '),
    errDownloading: [
            chalk.red(' !'),
            chalk.yellow('Oh no, something went wrong.'),
            chalk.red('\n !'),
            chalk.yellow('But there is nothing to worry.'),
            chalk.red('\n !'),
            chalk.yellow('Just try again.')
        ].join(' '),
    downloaded: (title) => [
            chalk.green(' ✔'),
            chalk.white('Saved:'),
            chalk.dim(`${title}.${extension}`)
        ].join(' '),
    progress: (downloaded, total) => [
            chalk.blue(' +'),
            chalk.dim('Progress:'),
            chalk.yellow(`[ ${downloaded} / ${total} ]`)
        ].join(' '),
    readFile: (filePath) => [
            chalk.blue(' +'),
            chalk.white('Reading file:'),
            chalk.dim(filePath)
        ].join(' '),
    itemsFound: (total) => [
            chalk.blue(' +'),
            chalk.white(`Found ${total} items`)
        ].join(' '),
    itemOfTotal: (current, total) => [
            chalk.blue(' +'),
            chalk.white(`[ ${current} / ${total} ]`)
        ].join(' '),
    commandNotFound: [
            chalk.red(' !'),
            chalk.yellow('Command Not Found'),
            chalk.red('\n !'),
            chalk.yellow('Use "vdl -h" for help')
        ].join(' '),
    done: [
            chalk.green(' ✔'),
            chalk.dim('Done\n')
        ].join(' ')
};

/**
 * Terminal output functions
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

const done = () => {
    log(msg.done);
    rl.close();
};

/**
 * Download video functions
 */

const isValidUrl = (url) => (
    url && url.toLowerCase().startsWith('http')
);

const validateUrl = url => {
    return new Promise(
        (resolve, reject) => {
            if (isValidUrl(url)) {
                resolve(
                    url.split('&')[0]
                );
            }
            else {
                reject(msg.invalidUrl);
            }
        }
    );
};

const getVideoInfo = (url) => {
    log(msg.getInfo(url));

    return new Promise((resolve, reject) => {
        ytdl.getInfo(url, (err, info) => {
            if (err) {
                reject(msg.errGetInfo(url));
            }
            else {
                resolve(info);
            }
        });
    });
};

const searchVideoInfo = (keyword) => {
    log(msg.searchInfo(keyword));

    const url = `gvsearch1:${keyword}`;

    return new Promise((resolve, reject) => {
        youtubedl.getInfo(url, (err, info) => {
            if (err) {
                reject(msg.errSearchInfo(keyword));
            }
            else {
                resolve({
                    title: info.title,
                    url: `https://www.youtube.com/watch?v=${info.id}`
                });
            }
        });
    });
};

const formatVideoInfo = (info) => {
    const stripCharacters = (str) => {
        let updatedStr = str;

        updatedStr = updatedStr.replace(/[\s|:?\.\\\/]/g, '-');
        updatedStr = updatedStr.replace(/-+/g, '-');
        updatedStr = updatedStr.replace(/[\"\*]/g, '');

        return updatedStr;
    };
    const strippedTitle = stripCharacters(info.title);

    return new Promise((resolve, reject) => {
        translate(strippedTitle, {to: lang}).then(
            translatedTitle => resolve({
                info,
                title: stripCharacters(translatedTitle)
            })
        ).catch(
            err => {
                log(msg.errTranslateTitle);
                resolve(strippedTitle);
            }
        );
    });
};

const downloadFromVideoInfo = (videoInfo) => {
    const title = videoInfo.title;
    let dlStream = ytdl.downloadFromInfo(videoInfo.info);

    log(msg.downloading(title));

    dlStream.pipe(
        fs.createWriteStream(`${currentDir}/${title}.${extension}`)
    );

    return new Promise((resolve, reject) => {
        dlStream.on('progress', (chunk, downloaded, total) => {
            writeLine(msg.progress(downloaded, total));

            if (downloaded === total) {
                readline.cursorTo(process.stdout, 0, null);
                readline.clearLine(process.stdout, 0);
                resolve(msg.downloaded(title));
            }
        });
    });
};

/**
 * Terminal command definitions
 */

program
    .version(version)
    .option('-u, --url [urlpath]', 'Specify video url')
    .option('-f, --file [filepath]', 'Specify file location')
    .option('-l, --lang [name]', 'Set language')
    .parse(process.argv);

let commandFound = false;

const onCommandFound = () => {
    commandFound = true;
    log(msg.about);
};

let lang = program.lang || 'en';

if (program.url) {
    onCommandFound();

    validateUrl(program.url)
        .then(url => getVideoInfo(url))
        .then(info => formatVideoInfo(info))
        .then(videoInfo => downloadFromVideoInfo(videoInfo))
        .then(videoDownloadedMsg => log(videoDownloadedMsg))
        .then(() => done())
        .catch((err) => {
            log(msg.errDownloading);
            done();
        });
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

    const count = ((total) => {
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
        let searchDone = null;

        count();

        if (!url) {
            searchDone = Promise.reject(msg.invalidUrl);
        }
        else if (!isValidUrl(url)) {
            // If the suffix doesn't start with 'http',
            // assume it's a search.
            searchDone = searchVideoInfo(url);
        }
        else {
            searchDone = Promise.resolve({url});
        }

        searchDone
            .then(searchResult => getVideoInfo(searchResult.url))
            .then(info => formatVideoInfo(info))
            .then(videoInfo => downloadFromVideoInfo(videoInfo))
            .then(videoDownloadedMsg => log(videoDownloadedMsg))
            .then(downloadNextInFile)
            .catch(downloadNextInFile);
    };

    const downloadNextInFile = (err) => {
        const nextUrl = contentList.shift();

        if (err) {
            log(err);
        }

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
    log(msg.about);
    log(msg.commandNotFound);
    rl.close();
}
