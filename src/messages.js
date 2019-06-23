#!/usr/bin/env node

const chalk = require('chalk');
const logSymbols = require('log-symbols');

/**
 * Messages
 */

const msg = {
    about: (name, version) => [
            chalk.white(` ${name.toUpperCase()}`),
            chalk.gray(`- ${version}`)
        ].join(' '),
    usage: chalk.white('[options]'),
    examples: (name) => [
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
    downloading: (fileName) => [
            chalk.blue(' +'),
            chalk.white('Downloading:'),
            chalk.gray(fileName)
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
    downloaded: (fileName) => [
            ` ${logSymbols.success}`,
            chalk.white('Saved:'),
            chalk.gray(fileName)
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
    commandNotFound: (name) => [
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

module.exports = msg;
