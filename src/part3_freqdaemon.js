const minimist = require('minimist');
const fs = require('fs');

function run(dir, n, p, tt) {
    // assumption: the program only watches for new documents, ignores the one already there at startup
    fs.watch(dir, (eventType, filename) => {
        console.log('event', eventType, 'file', filename);
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