const dfd = require("danfojs-node");
const { json } = require("express");


function dataframeToHTML(headData, columns){

    const htmlHeader = `<thead>
            <tr>${columns.map((column, index) => `<th>${column}</th>`).join('')}</tr>
        </thead>`;

    // Convert the head data to an HTML table body
    const htmlBody = `<tbody>
            ${headData.map(row => `<tr>${Object.values(row).map(value => `<td>${value}</td>`).join('')}</tr>`).join('')}
        </tbody>`;

    // Combine the HTML header and body to form the complete table
    const htmlTable = `<table border="1">${htmlHeader}${htmlBody}</table>`;
    return htmlTable;
}


dfd.readJSON("./datasets/deneme.json")
    .then(df => {
        const htmlTableForHead = dataframeToHTML(df.head().values, df.columns);


        dataIncolumnFormat = df.describe()['$dataIncolumnFormat'];
        index = df.describe()['$index'];
        columns = df.describe()['columns'];

        let jsonSummary = [];

        for (let ctr in dataIncolumnFormat) {
            const result = {};
            dataIncolumnFormat[ctr].forEach((key, i) => {
                result[index[i]] = dataIncolumnFormat[ctr][i];
            });
            result['column'] = columns[ctr]
            jsonSummary.push(result);
        }
        const htmlTableForSummary = dataframeToHTML(jsonSummary, index);

        console.log(htmlTableForHead + htmlTableForSummary);
    })
    .catch(err => {
        console.log(err);
    });