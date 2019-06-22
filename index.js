#!/usr/bin/env node

const package = require('./package.json');
const process = require('process');
const fs = require('fs');
const readline = require('readline');
const program = require('commander');
const chalk = require('chalk');
const logSymbols = require('log-symbols');
const ytdl = require('ytdl-core');
const youtubedl = require('youtube-dl');
const translate = require('translate-google');

const name = package.name;
const version = package.version;
const log = console.log;

const currentDir = process.cwd();
const fileExtension = 'mp4';
const buildFileName = (title) => `${title}.${fileExtension}`;
const buildFilePath = (title) => `${currentDir}/${buildFileName(title)}`;

/**
 * Messages
 */

const msg = {
    about: [
            chalk.white(` ${name.toUpperCase()}`),
            chalk.gray(`- ${version}`)
        ].join(' '),
    usage: chalk.white('[options]'),
    examples: [
            '\n',
            chalk.white('Example:'),
            chalk.white(`\n  $ ${name} -h`),
            chalk.white(`\n  $ ${name} -u 'link'`)
        ].join(' '),
    ytdlError: [
            ` ${logSymbols.error}`,
            chalk.yellow('Youtube-dl module error')
        ].join(' '),
    invalidUrl: (url) => [
            ` ${logSymbols.warning}`,
            chalk.yellow('Please provide a valid url:'),
            chalk.gray(url)
        ].join(' '),
    getInfo: (url) => [
            chalk.blue(' +'),
            chalk.white('Getting info:'),
            chalk.gray(url)
        ].join(' '),
    errGetInfo: (url) => [
            ` ${logSymbols.error}`,
            chalk.yellow('Error getting video info:'),
            chalk.gray(url)
        ].join(' '),
    searchInfo: (keyword) => [
            chalk.blue(' +'),
            chalk.white('Searching video info:'),
            chalk.gray(keyword)
        ].join(' '),
    errSearchInfo: (keyword) => [
            ` ${logSymbols.error}`,
            chalk.yellow('Error searching video info:'),
            chalk.gray(keyword)
        ].join(' '),
    errTranslateTitle: [
            ` ${logSymbols.warning}`,
            chalk.yellow('Error translating video title'),
            '\n',
            logSymbols.warning,
            chalk.yellow('Using original title')
        ].join(' '),
    downloading: (title) => [
            chalk.blue(' +'),
            chalk.white('Downloading:'),
            chalk.gray(buildFileName(title))
        ].join(' '),
    errDownloading: [
            ` ${logSymbols.warning}`,
            chalk.yellow('Oh no, something went wrong.'),
            '\n',
            logSymbols.warning,
            chalk.yellow('Use -e to view the error and try again.')
        ].join(' '),
    downloadFailed: (err) => [
            ` ${logSymbols.warning}`,
            chalk.yellow('Failed to download the video:'),
            '\n',
            chalk.gray(err)
        ].join(' '),
    downloaded: (title) => [
            ` ${logSymbols.success}`,
            chalk.white('Saved:'),
            chalk.gray(buildFileName(title))
        ].join(' '),
    progress: (downloaded, total) => [
            chalk.blue(' +'),
            chalk.white('Progress:'),
            chalk.yellow(`[ ${downloaded} / ${total} ]`)
        ].join(' '),
    readFile: (filePath) => [
            chalk.blue(' +'),
            chalk.white('Reading file:'),
            chalk.gray(filePath)
        ].join(' '),
    itemsFound: (total) => [
            chalk.blue(' +'),
            chalk.white(`ITEMS:`),
            chalk.yellow(`${total}`)
        ].join(' '),
    itemOfTotal: (current, total) => [
            chalk.blue(' +'),
            chalk.white('ITEM:'),
            chalk.yellow(`[ ${current} / ${total} ]`)
        ].join(' '),
    commandNotFound: [
            ` ${logSymbols.warning}`,
            chalk.yellow('Command Not Found'),
            '\n',
            logSymbols.warning,
            chalk.yellow(`Use "${name} -h" for help`)
        ].join(' '),
    done: [
            ` ${logSymbols.success}`,
            chalk.white('Done\n')
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

const clearLine = () => {
    readline.cursorTo(process.stdout, 0, null);
    readline.clearLine(process.stdout, 0);
};

const close = () => rl.close();

const done = () => {
    log(msg.done);
    close();
};

/**
 * Download video functions
 */

const isValidUrl = (url) => (
    url && url.toLowerCase().startsWith('http')
);

const validateUrl = async (url) => {
    if (!isValidUrl(url)) {
        throw (msg.invalidUrl);
    }

    return (url.split('&')[0]);
};

const getVideoInfo = async (url) => {
    log(msg.getInfo(url));

    let info = null;

    try {
        info = await ytdl.getInfo(url);
    }
    catch (exception) {
        throw (msg.errGetInfo(url));
    }

    return info;
};

const buildVideoUrl = (id) => (
    `https://www.youtube.com/watch?v=${id}`
);

const searchVideoInfo = (keyword) => {
    log(msg.searchInfo(keyword));

    const url = `gvsearch1:${keyword}`;

    return new Promise((resolve, reject) => {
        try {
            youtubedl.getInfo(url, (err, info) => {
                if (err) {
                    reject(msg.errSearchInfo(keyword));
                }
                else {
                    resolve({
                        title: info.title,
                        url: buildVideoUrl(info.id)
                    });
                }
            });
        } catch (exception) {
            reject(msg.ytdlError);
        }
    });
};

const stripCharacters = (str) => {
    let updatedStr = str;

    updatedStr = updatedStr.replace(/[\s|:?\.\\\/]/g, '-');
    updatedStr = updatedStr.replace(/-+/g, '-');
    updatedStr = updatedStr.replace(/[\"\*]/g, '');

    return updatedStr;
};

const formatVideoInfo = async (info, langSetting) => {
    const strippedTitle = stripCharacters(info.title);

    if (!langSetting) {
        return {
            info,
            title: strippedTitle
        };
    }

    try {
        const translatedTitle = await translate(
            strippedTitle,
            {to: langSetting}
        );

        return {
            info,
            title: stripCharacters(translatedTitle)
        };
    } catch (exception) {
        log(msg.errTranslateTitle);

        return {
            info,
            title: strippedTitle
        };
    }
};

const downloadFromVideoInfo = (videoInfo) => {
    const title = videoInfo.title;

    log(msg.downloading(title));

    return new Promise((resolve, reject) => {
        ytdl.downloadFromInfo(videoInfo.info)
            .on('error', (err) => reject(err))
            .on('progress', (chunk, downloaded, total) => {
                writeLine(msg.progress(downloaded, total));

                if (downloaded === total) {
                    clearLine();
                    resolve(msg.downloaded(title));
                }
            }).pipe(
                fs.createWriteStream(buildFilePath(title))
            );
    });
};

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
        log(msg.examples);
    })
    .parse(process.argv);

let commandFound = false;

const onCommandFound = () => {
    commandFound = true;
    log(msg.about);
};

let lang = program.lang || '';

if (program.url) {
    onCommandFound();

    validateUrl(program.url)
        .then(url => getVideoInfo(url))
        .then(info => formatVideoInfo(info, lang))
        .then(videoInfo => downloadFromVideoInfo(videoInfo))
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
            .then(info => formatVideoInfo(info, lang))
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
    close();
}
