const minimist = require('minimist');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

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
            const tfs = await calculateTFS(path.resolve(dir, filename), ttRules);

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
            printTopDocuments(documents, n);
        }
    });
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
        acc[term] = Math.log(totalDocuments / (1 + documentsByTerm[term]));
        return acc;
    }, {});
}

function calculateTfIdf(tf, idf) {
    return tf * idf;
}

function printTopDocuments(documents, n) {
    documents
        .filter((doc, index) => index < n)
        .forEach((doc, index) => {
            console.log(`#${index + 1} ${Math.round(doc.ttfidf * 100) / 100} ${doc.filename}`);
        });
}

async function calculateTFS(filepath, termRules) {
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