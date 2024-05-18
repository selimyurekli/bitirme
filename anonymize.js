const crypto = require('crypto');


function anonymize(jsonData, methodsToAnonymize, filePath) {
    const columnsToAnonymized = Object.keys(methodsToAnonymize);
    jsonData.forEach(record => {
        columnsToAnonymized.forEach(column => {
            if (record.hasOwnProperty(column)) {
                switch (methodsToAnonymize[column]) {
                    case 'remove':
                        delete record[column];
                        break;
                    case 'mask':
                        record[column] = maskString(record[column]);
                        break;
                    case 'hash':
                        record[column] = hashString(record[column]);
                        break;    
                    case 'empty':
                        record[column] = emptyString(record[column]);
                        break;  
                    case 'randomize':
                        record[column] = randomizeString(record[column]);
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

function emptyString(str) {
    if (str == null && typeof(str) == 'String') {
        return "null";
    }
    //remove all column
    return "";
}

function maskString(str) {
    if (str == null) {
        return "null";
    }
    return '*'.repeat(10);
}

function hashString(str){
    if (str == null){
        return "null";
    }
    // Convert integer to string
    if (typeof str === 'number') {
        str = str.toString();
    }
    const hash = crypto.createHash('sha256');
    hash.update(str);
    return hash.digest('hex');
}

function randomizeString(str) {
    if (str == null) {
        return "null";
    }
    
    if (typeof str !== 'string') {
        return str; // Return input unchanged if it's not a string
    }

    let randomizedStr = '';
    for (let i = 0; i < str.length; i++) {
        const randomChar = String.fromCharCode(Math.floor(Math.random() * 26) + 97); // Random lowercase ASCII character
        randomizedStr += randomChar;
    }

    return randomizedStr;
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
            return res.status(500).json({ error: 'Unsupported file extension.' });
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
        return res.status(500).json({ error: 'Internal Server Error' });

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
