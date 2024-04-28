// banword.js
const HttpError = require('./httpError.js');
const fs = require('fs');
const path = require('path');

function replaceBanWord(text) {
    const filePath = path.join(__dirname, 'banwords.json');
    try {
        // Read the content of the banword.json file
        const content = fs.readFileSync(filePath, 'utf8');

        const bannedWords = JSON.parse(content);

        // Replace each banned word with asterisks
        bannedWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            text = text.replace(regex, '*****');
        });

        return text; // Return the modified text
    } catch (error) {
        throw new HttpError(error.message, { httpCode: error.httpCode || 500 })
    }
}

module.exports = {
    replaceBanWord,
};
