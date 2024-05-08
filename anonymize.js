const crypto = require('crypto');


function anonymize(jsonData, methodsToAnonymize, filePath) {
    const columnsToAnonymized = Object.keys(methodsToAnonymize);
    jsonData.forEach(record => {
        columnsToAnonymized.forEach(column => {
            if (record.hasOwnProperty(column)) {
                switch (methodsToAnonymize[column]) {
                    case 'remove':
                        record[column] = removeString(record[column]);
                        break;
                    case 'anonymize':
                        record[column] = anonymizeString(record[column]);
                        break;
                    case 'hash':
                        record[column] = hashString(record[column]);
                        break;    
                    case 'none':
                        break;    
                    default:
                        console.error('Invalid anonymization method:', methodsToAnonymize[column]);
                        break;
                }
            } else {
                console.error('Column not found in record:', column);
            }
        });
    });

    return jsonData;
}

function removeString(str) {
    if (str == null && typeof(str) == 'String') {
        return "null";
    }
    //remove all column
    return "";
}

function anonymizeString(str) {
    if (str == null) {
        return "null";
    }
    const regex = /./g;
    return str.replace(regex, "*");
}

function hashString(str){
    if (str == null){
        return "null";
    }
    const hash = crypto.createHash('sha256');
    hash.update(str);
    return hash.digest('hex');
}

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');


async function anonymizeFile(filePath, methodsToAnonymize, savedFilePath) {
    try {
        const fileExt = path.extname(filePath).toLowerCase();

        let jsonData;
        if (fileExt === '.json') {
            jsonData = await readJSONFile(filePath);
        } else if (fileExt === '.csv') {
            jsonData = await readCSVFile(filePath);
            console.log(jsonData);
        } else {
            throw new Error('Unsupported file type:', fileExt);
        }

        const anonymizedData = anonymize(jsonData, methodsToAnonymize);
        if (fileExt === '.json') {
            await writeJSONFile(savedFilePath, anonymizedData);
        } else if (fileExt === '.csv') {
            await writeCSVFile(savedFilePath, anonymizedData);
        }

        console.log('Anonymization completed for file:', filePath);
    } catch (error) {
        console.error('Anonymization error for file:', filePath, error);
    }
}

function readJSONFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    reject(error);
                }
            }
        });
    });
}

function readCSVFile(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

function writeJSONFile(filePath, data) {
    console.log(filePath)
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8', (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function writeCSVFile(filePath, data) {
    console.log(filePath)

    return new Promise((resolve, reject) => {
        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: Object.keys(data[0]).map(key => ({ id: key, title: key }))
        });

        csvWriter.writeRecords(data)
            .then(() => {
                console.log(`CSV file written to ${filePath}`);
                resolve(filePath);
            })
            .catch(error => {
                console.error('Error writing CSV file:', error);
                reject(error);
            });
    });
}

module.exports = {anonymizeFile}
