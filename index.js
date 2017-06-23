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
    getInfo: (url) => [
            chalk.white('+'),
            chalk.blue('Getting info:'),
            chalk.dim(url)
        ].join(' '),
    errGetInfo: (url) => [
            chalk.white('✖'),
            chalk.red('Error getting video info:'),
            chalk.dim(url)
        ].join(' '),
    searchInfo: (keyword) => [
            chalk.white('+'),
            chalk.blue('Searching video info:'),
            chalk.dim(keyword)
        ].join(' '),
    errSearchInfo: (keyword) => [
            chalk.white('✖'),
            chalk.red('Error searching video info:'),
            chalk.dim(keyword)
        ].join(' '),
    downloading: (title) => [
            chalk.white('-'),
            chalk.blue('Downloading:'),
            chalk.dim(`${title}.${extension}`)
        ].join(' '),
    progress: (downloaded, total) => [
            chalk.white('-'),
            chalk.blue('Progress:'),
            chalk.yellow(`[ ${downloaded} / ${total} ]`)
        ].join(' '),
    readFile: (filePath) => [
            chalk.white('+'),
            chalk.blue('Reading file:'),
            chalk.dim(filePath)
        ].join(' '),
    done: [
            chalk.white('✔'),
            chalk.green('Done')
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

const getVideoInfo = (url) => {
    log(msg.getInfo(url));

    return new Promise((resolve, reject) => {
        ytdl.getInfo(url, (err, info) => {
            if (err) {
                log(msg.errGetInfo(url));
                reject(err);
            }
            else {
                resolve(info);
            }
        });
    });
};

const searchVideoInfo = (keyword) => {
    log(msg.searchInfo(keyword));

    const url = 'gvsearch1:' + keyword;

    return new Promise((resolve, reject) => {
        youtubedl.getInfo(url, (err, info) => {
            if (err) {
                log(msg.errSearchInfo(keyword));
                reject(err);
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
        updatedStr = updatedStr.replace(/[\"]/g, '');

        return updatedStr;
    };
    const strippedTitle = stripCharacters(info.title);

    return new Promise((resolve, reject) => {
        translate(strippedTitle, {to: 'en'}).then(
            translatedTitle => resolve({
                info,
                title: stripCharacters(translatedTitle)
            })
        ).catch(
            err => reject(err)
        );
    });
};

const downloadFromVideoInfo = (videoInfo) => {
    let dlStream = ytdl.downloadFromInfo(videoInfo.info);
    const title = videoInfo.title;

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
                resolve();
            }
        });
    });
};

/**
 * Terminal command definitions
 */

program
    .version(version)
    .option('-u, --url [urlpath]', 'Add url')
    .option('-f, --file [filepath]', 'Add file')
    .parse(process.argv);

let commandFound = false;

if (program.url) {

    commandFound = true;

    getVideoInfo(program.url)
        .then(info => formatVideoInfo(info))
        .then(videoInfo => downloadFromVideoInfo(videoInfo))
        .then(() => done());
}

if (program.file) {

    commandFound = true;

    const filePath = program.file;
    const content = fs.readFileSync(program.file, 'utf-8');
    const contentList = content.split('\n');

    log(msg.readFile(filePath));

    const searchAndDownload = url => {

        let searchDone = null;

        // If the suffix doesn't start with 'http',
        // assume it's a search.
        if (url && !url.toLowerCase().startsWith('http')) {
            searchDone = searchVideoInfo(url);
        }
        else {
            searchDone = Promise.resolve();
        }

        searchDone
            .then(searchResult => getVideoInfo(searchResult.url))
            .then(info => formatVideoInfo(info))
            .then(videoInfo => downloadFromVideoInfo(videoInfo))
            .then(() => {
                const nextUrl = contentList.shift();

                if (nextUrl) {
                    searchAndDownload(nextUrl);
                }
                else {
                    done();
                }
            })
            .catch(() => done());
    };

    searchAndDownload(contentList.shift());
}

if (!commandFound) {
    log('Command not found.');
    rl.close();
}