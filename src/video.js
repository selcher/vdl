#!/usr/bin/env node

const fs = require('fs');
const ytdl = require('ytdl-core');
const youtubedl = require('youtube-dl');
const translate = require('translate-google');

const msg = require('./messages');
const info = require('./info');

/**
 * Download video functions
 */

const isValidUrl = (url) => (
  url && typeof url === 'string' && url.toLowerCase().startsWith('http')
);

const _validateUrl = async (url) => {
  if (!isValidUrl(url)) {
    throw (msg.invalidUrl(url));
  }

  return (url.split('&')[0]);
};

const _getVideoInfo = async (url) => {
  let info = null;

  try {
    info = await ytdl.getInfo(url);
  }
  catch (exception) {
    throw (msg.errGetInfo(url));
  }

  return info;
};

const _getVideoTitle = (info) => {
  if (!info) {
    return 'vid';
  }

  if (info.title) {
    return info.title;
  }

  let title = '';

  try {
    let playerResponse = JSON.parse(info.player_response);
    title = playerResponse.videoDetails.title;
  }
  catch(exc) {
    title = 'video';
  }

  return title;
};

const _buildVideoUrl = (id) => (
  `https://www.youtube.com/watch?v=${id}`
);

const _searchVideoInfo = (keyword) => {
  const url = `gvsearch1:${keyword}`;

  return new Promise((resolve, reject) => {
    try {
      youtubedl.getInfo(url, (err, info) => {
        if (err) {
          reject(msg.errSearchInfo(keyword));
        }
        else {
          resolve({
            title: _getVideoTitle(info),
            url: _buildVideoUrl(info.id)
          });
        }
      });
    }
    catch (exception) {
      reject(msg.ytdlError);
    }
  });
};

const _stripCharacters = (str) => {
  let updatedStr = str ? str : '';

  updatedStr = updatedStr.replace(/[\s|:?\.\\\/]/g, '-');
  updatedStr = updatedStr.replace(/-+/g, '-');
  updatedStr = updatedStr.replace(/[\"\*]/g, '');

  return updatedStr;
};

const _formatVideoInfo = async (info, langSetting) => {
  const title = _getVideoTitle(info);
  const strippedTitle = _stripCharacters(title);

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
      title: _stripCharacters(translatedTitle)
    };
  }
  catch (exception) {
    return {
      info,
      title: strippedTitle,
      error: msg.errTranslateTitle
    };
  }
};

const _downloadFromVideoInfo = (videoInfo) => {
  return new Promise((resolve, reject) => {
    ytdl.downloadFromInfo(
          videoInfo.info,
          { "filter": "videoandaudio" }
        )
        .on('error', (err) => reject(err))
        .on('progress', (chunk, downloaded, total) => {
          _progressLogger(downloaded, total);

          if (downloaded === total) {
            resolve(msg.downloaded(info.getFileName(videoInfo)));
          }
        }).pipe(
          fs.createWriteStream(info.getFilePath(videoInfo))
        );
  });
};

let _progressLogger = () => {};

const setProgressLogger = (logger) => {
  _progressLogger = logger;
};

let _lang = '';

const setLanguage = (languageCode) => {
  _lang = languageCode;
};

const getInfo = (url) => {
  return _validateUrl(url)
    .then(validUrl => _getVideoInfo(validUrl))
    .then(info => _formatVideoInfo(info, _lang));
};

const searchInfo = _searchVideoInfo;
const downloadFromInfo = _downloadFromVideoInfo;

const downloadFromUrl = (url) => {
  return getInfo(url)
    .then(videoInfo => downloadFromInfo(videoInfo));
};

const fallbackDownloadFromUrl = (url) => {
  return new Promise((resolve, reject) => {
    const stream = ytdl(url);

    stream.pipe(fs.createWriteStream('video.mp4'))
    stream.on('end', resolve);
    stream.on('error', reject);
  });
};

const downloadFromKeyword = (keyword) => {
  return searchInfo(keyword)
    .then(searchResult => downloadFromUrl(searchResult.url));
};

module.exports = {
  isValidUrl,
  setLanguage,
  setProgressLogger,
  getInfo,
  searchInfo,
  downloadFromInfo,
  downloadFromUrl,
  fallbackDownloadFromUrl,
  downloadFromKeyword
};
