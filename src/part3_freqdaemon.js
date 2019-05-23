const minimist = require('minimist');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

// select calc versions
//const calculateTfs = calculateTfs_v1;
const calculateTfs = calculateTfs_v2;

function run(dir, n, p, tt) {
    // ttRules = list of {term, rule} objects relating terms with regex rules ready to use as matchers
    const ttRules = tt.map(term => {
        return {
            term: term.toLowerCase(),
            rule: new RegExp('\\b' + term + '\\b', 'ig')
        };
    });

    // docsByTerm[term] = how many documents include the term
    const docsByTerm = ttRules.reduce((acc, termRule) => {
        acc[termRule.term] = 0;
        return acc;
    }, {});

    // documents = list of {filename, tfs, tfidfs, ttfidf}
    // documents[i].tfs[t] = tf for term t at document i, just calculated once
    // documents[i].tfidfs[t] = tf-idf for term t at document i, re-calculated each time a new document appears
    // documents[i].ttfidf = sum of tf-idf for all terms at document i, re-calculated each time a new document appears
    let documents = [];

    fs.watch(dir, async (eventType, filename) => {
        if (eventType === 'rename') {
            const tfs = await calculateTfs(path.resolve(dir, filename), ttRules);

            // update docsByTerm
            ttRules.forEach(termRule => {
                if (tfs[termRule.term] > 0) {
                    docsByTerm[termRule.term]++;
                }
            });

            // add the new document, so far we only know the tfs
            documents.push({
                filename: filename,
                tfs: tfs,
                tfidfs: {},
                ttfidf: 0
            });

            recalculateDocumentStats(documents, docsByTerm);
        }
    });

    // prepare scheduled method printing the top ranking
    const printTopDocuments = () => {
        console.log(`\nTop ${n} documents at ${new Date().toISOString()}:`);
        documents
            .filter((doc, index) => index < n)
            .forEach((doc, index) => {
                console.log(`#${index + 1} ${Math.round(doc.ttfidf * 100) / 100} ${doc.filename}`, doc.tfs, doc.tfidfs);
            });
        if (documents.length < 1) {
            console.log('No documents yet.');
        }
        setTimeout(printTopDocuments, p * 1000);
    }
    setTimeout(printTopDocuments, p * 1000);

    console.log('Process started.');
}

function recalculateDocumentStats(documents, docsByTerm) {
    let terms = Object.keys(docsByTerm);

    // calculate the idf for each term
    const idfs = calculateIdfs(documents.length, terms, docsByTerm);

    // re-calculate for each document the tfidf per term and the total ttfidf
    documents.forEach(document => {
        document.ttfidf = 0;
        terms.forEach(term => {
            tfidf = calculateTfIdf(document.tfs[term], idfs[term]);
            document.tfidfs[term] = tfidf;
            document.ttfidf += tfidf;
        });
    });

    // sort documents descending by ttfidf
    return documents.sort((docA, docB) => docB.ttfidf - docA.ttfidf);
}

function calculateIdfs(totalDocuments, terms, documentsByTerm) {
    return terms.reduce((acc, term) => {
        // the recommended adjustment adding 1 to the number of documents including the term causes negative values for little set of documents
        // we force the idf = 0 instead to avoid division by zero
        const idf = documentsByTerm[term] > 0 ? Math.log(totalDocuments / (documentsByTerm[term])) : 0;
        acc[term] = idf;
        return acc;
    }, {});
}

function calculateTfIdf(tf, idf) {
    return tf * idf;
}

// tf version #1: tf = absolute number of occurences for term t in the document
async function calculateTfs_v1(filepath, termRules) {
    return new Promise(resolve => {
        const inStream = fs.createReadStream(filepath);
        const rl = readline.createInterface(inStream, null);

        const tfByTerm = termRules.reduce((acc, termRule) => {
            acc[termRule.term] = 0;
            return acc;
        }, {});

        rl.on('line', (line) => {
            termRules.forEach(termRule => {
                const match = line && line.match(termRule.rule);
                match && (tfByTerm[termRule.term] += match.length);
            });
        });

        rl.on('close', () => {
            resolve(tfByTerm);
        })
    });
}

// tf version #2: tf = occurences of t / total word count
async function calculateTfs_v2(filepath, termRules) {
    return new Promise(resolve => {
        const inStream = fs.createReadStream(filepath);
        const rl = readline.createInterface(inStream, null);

        const tfByTerm = termRules.reduce((acc, termRule) => {
            acc[termRule.term] = 0;
            return acc;
        }, {});

        let totalCount = 0;

        rl.on('line', (line) => {
            termRules.forEach(termRule => {
                const match = line && line.match(termRule.rule);
                match && (tfByTerm[termRule.term] += match.length);
            });
            totalCount += line.split(' ').filter(w => !!w).length;
        });

        rl.on('close', () => {
            termRules.forEach(termRule => {
                tfByTerm[termRule.term] = tfByTerm[termRule.term] / totalCount;
            });
            resolve(tfByTerm);
        })
    });
}

module.exports = {
    run: run
};

// command-line execution
if (require.main === module) {
    const argv = minimist(process.argv.slice(2));

    // parse and check parameters

    if (typeof argv.t !== 'string') {
        console.error('Invalid search terms. Use "-t "here comes the terms".');
        process.exit(-1);
    }

    const dir = argv.d;
    const n = Number(argv.n);
    const p = Number(argv.p);
    const tt = argv.t.split(' ').filter(t => !!t);

    if (!dir) {
        console.error('You must specify the documents folder with the -d flag.');
        process.exit(-1);
    }

    if (!fs.existsSync(dir)) {
        console.error(`Path ${dir} does not exist.`);
        process.exit(-1);
    }

    if (!fs.lstatSync(dir).isDirectory()) {
        console.error(`Path ${dir} is not a directory.`);
        process.exit(-1);
    }

    if (!n || n < 1) {
        console.error('Invalid number of top results to show. Use "-n val" with val being a positive integer value.');
        process.exit(-1);
    }

    if (!p || p < 1) {
        console.error('Invalid period of time. Use "-p [value]" with "-p val" with val being a positive integer value.');
        process.exit(-1);
    }

    if (!tt || tt.length < 1) {
        console.error('Invalid search terms. Use "-t "here comes the terms".');
        process.exit(-1);
    }

    // ok, let's begin
    module.exports.run(dir, n, p, tt);
}