const cluster = require('cluster');
const readline = require('readline');
const fs = require('fs');

if (cluster.isMaster) {
    console.error('This module cannot be required at master process.');
    process.exit(-1);
}

process.on('message', function ({ filename, filepath, terms }) {
    getFileStats(filepath, terms).then((frequencies) => {
        process.send({
            filename,
            frequencies
        });
    });
});

/**
 * Given a plain text file's absolute path and a list of terms, resolves with
 * an object containing the number of occurences each term appear on the file
 * and the total word count using the special key _.
 */
function getFileStats(filepath, terms) {
    return new Promise((resolve, reject) => {
        // result[term] = number of occurences of the term
        // result._ = total word count
        const result = terms.reduce((acc, term) => {
            acc[term] = 0;
            return acc;
        }, { _: 0 });

        const rl = readline.createInterface(fs.createReadStream(filepath), null);

        rl.on('line', line => {
            // update total word count (ignoring extra white spaces)
            result._ += line.split(' ').filter(x => !!x).length;
            // update count for each term
            terms.forEach(term => {
                const match = line.match(new RegExp(`\\b${term}\\b`, 'ig'));
                match && (result[term] += match.length);
            });
        });

        rl.on('close', () => {
            // return file stats
            resolve(result);
        });

        rl.on('error', reject);
    });
}