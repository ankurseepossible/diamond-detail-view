import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const findByExtension = function(dir, ext) {
    const matchedFiles = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
        // Method 1:
        const fileExt = path.extname(file);
        if (fileExt === `.${ext}`) {
            matchedFiles.push(file);
        }
    }
    return matchedFiles;
};

function searchReplaceFile(regexpFinds, directory, fileName) {
    let matchedFiles = findByExtension(directory, fileName);
    matchedFiles.forEach(function(fileName) {
        const sourceFile = `${directory}${path.sep}${fileName}`;
        var file = fs.createReadStream(sourceFile, 'utf8');
        var newData = '';

        file.on('data', function (chunk) {
            regexpFinds.forEach(function({search, replace}) {
                chunk = chunk.toString().replace(search, replace);
            });
            newData += chunk;
        });

        file.on('end', function () {
            fs.writeFile(sourceFile, newData, function (err) {
                if (err) {
                    return console.log(err);
                } else {
                    console.log('Updated!');
                }
            });
        });
    });
}

searchReplaceFile([
    {search: /webgi/g, replace: 'immersive'},
    {search: /WEBGI/g, replace: 'IMMERSIVE'},
    {search: /WebGi/g, replace: 'Immersive'},
    {search: /webGi/g, replace: 'Immersive'},
], __dirname + '/dist/assets', 'js');
