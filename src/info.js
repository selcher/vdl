#!/usr/bin/env node

const process = require('process');
const currentDir = process.cwd();
const fileExtension = 'mp4';
const _buildFileName = (title) => `${title}.${fileExtension}`;
const _buildFilePath = (title) => `${currentDir}/${_buildFileName(title)}`;

const getTitle = (info) => (info.title);
const getFileName = (info) => (_buildFileName(getTitle(info)));
const getFilePath = (info) => (_buildFilePath(getTitle(info)));

module.exports = {
    getTitle,
    getFileName,
    getFilePath
};
