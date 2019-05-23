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

    console.log(docsByTerm);

    fs.watch(dir, async (eventType, filename) => {
        if (eventType === 'rename') {
            const tfs = await calculateTFS(path.resolve(dir, filename), ttRules);
            ttRules.forEach(termRule => {
                if (tfs[termRule.term] > 0) {
                    docsByTerm[termRule.term]++;
                }
            });
            console.log(docsByTerm);
        }
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