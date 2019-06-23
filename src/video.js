#!/usr/bin/env node

const ytdl = require('ytdl-core');
const youtubedl = require('youtube-dl');
const translate = require('translate-google');

const log = console.log;
const msg = require('./messages');

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

const currentDir = process.cwd();
const fileExtension = 'mp4';
const buildFileName = (title) => `${title}.${fileExtension}`;
const buildFilePath = (title) => `${currentDir}/${buildFileName(title)}`;

const downloadFromVideoInfo = (videoInfo) => {
    const title = videoInfo.title;
    const fileName = buildFileName(title);

    log(msg.downloading(fileName));

    return new Promise((resolve, reject) => {
        ytdl.downloadFromInfo(videoInfo.info)
            .on('error', (err) => reject(err))
            .on('progress', (chunk, downloaded, total) => {
                terminal.writeLine(msg.progress(downloaded, total));

                if (downloaded === total) {
                    terminal.clearLine();
                    resolve(msg.downloaded(fileName));
                }
            }).pipe(
                fs.createWriteStream(buildFilePath(title))
            );
    });
};

const downloadFromUrl = (url) => {
    return validateUrl(program.url)
        .then(url => getVideoInfo(url))
        .then(info => formatVideoInfo(info, lang))
        .then(videoInfo => downloadFromVideoInfo(videoInfo));
};

const downloadFromKeyword = (keyword) => {
    return searchVideoInfo(keyword)
        .then(searchResult => getVideoInfo(searchResult.url))
        .then(info => formatVideoInfo(info, lang))
        .then(videoInfo => downloadFromVideoInfo(videoInfo));
};

module.exports = {
    isValidUrl,
    downloadFromUrl,
    downloadFromKeyword
};
