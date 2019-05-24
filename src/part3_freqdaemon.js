require('console-stamp')(console, 'HH:MM:ss.l');

const minimist = require('minimist');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

let DEBUG; // additional console messages (use --debug)

// tf(t, d) variants
const tfsVariants = {
  raw: getTfs_rawCount,
  freq: getTfs_termFrequency,
  log: getTfs_logNormalization
};

// idf(t, D) variants
const idfsVariants = {
  standard: getIdfs_standard,
  smooth: getIdfs_smooth
};

// tfidf(t, d, D) variants
const tfIdfVariants = {
  default: getTfIdf
};

// helper loggers
const debugLog = function () { DEBUG && console.log.apply(this, arguments) };
const debugTime = function () { DEBUG && console.time.apply(this, arguments) };
const debugTimeEnd = function () { DEBUG && console.timeEnd.apply(this, arguments) };

function run(dir, n, p, tt, tfs_func, idfs_func, tfidf_func) {
  // ensure unique terms to avoid repeating work
  const terms = [...new Set(tt.map(term => term.toLowerCase()))];

  // docsByTerm[term] = how many documents include the term
  const docsByTerm = terms.reduce((acc, term) => {
    acc[term] = 0;
    return acc;
  }, {});

  // documents = list of { filename, tfs, ttfidf }
  // documents[i].tfs[t] = tf for term t at document i, just calculated once
  // documents[i].ttfidf = sum of tf-idf for all terms at document i, re-calculated each time a new document appears
  let documents = [];

  fs.watch(dir, (eventType, filename) => {
    if (eventType === 'rename') {
      debugTime(`processing ${filename}`);
      getFileStats(path.resolve(dir, filename), terms).then((fileFrequencies) => {
        const file_tfs = tfs_func(fileFrequencies, fileFrequencies._, terms);

        // update docsByTerm adding 1 to each term that appears in the current document
        terms.filter(term => fileFrequencies[term] > 0).forEach(term => docsByTerm[term]++);

        // push the new document, but so far we only know the tfs
        documents.push({
          filename: filename,
          tfs: file_tfs,
          ttfidf: 0
        });

        // once the new document tfs are available, we update the rest of data for all the set
        recalculateDocumentStats(idfs_func, tfidf_func, documents, docsByTerm);
        debugTimeEnd(`processing ${filename}`);
      });
    }
  });

  // prepare scheduled method printing the top ranking
  const printTopDocuments = () => {
    let strRanking = documents
      .filter((doc, index) => index < n)
      .map((doc, index) => `#${index + 1} ${Math.round(doc.ttfidf * 1000) / 1000} ${doc.filename}`)
      .join('\n');

    if (documents.length < 1) {
      strRanking = 'No documents yet.';
    }

    console.log(`\n\nTop ${n} documents:\n${strRanking}\n`);
    setTimeout(printTopDocuments, p * 1000);
  }
  setTimeout(printTopDocuments, p * 1000);

  console.log('Process started.');
}

/**
 * Updates the ttfidf value for each document.
 */
function recalculateDocumentStats(idfs_func, tfidf_func, documents, docsByTerm) {
  let terms = Object.keys(docsByTerm);

  // calculate the idf for each term
  const idfs = idfs_func(documents.length, docsByTerm, terms);

  // re-calculate for each document the tfidf per term and the total ttfidf
  documents.forEach(document => {
    document.ttfidf = 0;
    terms.forEach(term => {
      document.ttfidf += tfidf_func(document.tfs[term], idfs[term]);;
    });
  });

  // sort documents descending by ttfidf
  return documents.sort((docA, docB) => docB.ttfidf - docA.ttfidf);
}

/**
 * Given a plain text file's absolute path and a list of terms, resolves with
 * an object containing the number of occurences each term appear on the file
 * and the total word count using the special key _.
 */
async function getFileStats(filepath, terms) {
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

// ===========
// TF VARIANTS
// =========== 

// tf as "raw count": for each term, just the total amount of occurences for it
function getTfs_rawCount(frequencies, wordCount, terms) {
  return terms.reduce((acc, term) => {
    acc[term] = frequencies[term]
    return acc;
  }, {});
}

// tf as "term frequency": for each term, the amount of occurences of it adjusted for the number of words on the document
function getTfs_termFrequency(frequencies, wordCount, terms) {
  // take empty files into account!
  if (wordCount === 0) {
    return terms.reduce((acc, term) => {
      acc[term] = 0;
      return acc;
    }, {});
  } else {
    return terms.reduce((acc, term) => {
      acc[term] = frequencies[term] / wordCount;
      return acc;
    }, {});
  }
}

// tf as "log normalization": for each term, log(1 + raw count)
function getTfs_logNormalization(frequencies, wordCount, terms) {
  return terms.reduce((acc, term) => {
    acc[term] = Math.log(1 + frequencies[term]);
    return acc;
  }, {});
}

// ============
// IDF VARIANTS
// ============

// idf as "inverse document frequency": for each term, logarithm of the relation between the total amount of documents and the number of documents with that term
function getIdfs_standard(totalDocuments, docsByTerm, terms) {
  return terms.reduce((acc, term) => {
    const termDocumentCount = docsByTerm[term] || 0;
    acc[term] = termDocumentCount > 0 ? Math.log(totalDocuments / docsByTerm[term]) : 0;
    return acc;
  }, {});
}

// idf as "inverse document frequency smooth": same as standard, but plus 1 to avoid terms not included in any document
function getIdfs_smooth(totalDocuments, docsByTerm, terms) {
  return terms.reduce((acc, term) => {
    acc[term] = Math.log(totalDocuments / (1 + (docsByTerm[term] || 0)));
    return acc;
  }, {});
}

// ==============
// TFIDF VARIANTS
// ==============

function getTfIdf(tf, idf) {
  return tf * idf;
}

module.exports = {
  run: run
};

// command-line execution
if (require.main === module) {
  const argv = minimist(process.argv.slice(2));

  // parameter parsing and validation

  DEBUG = !!argv.debug; // debug flag

  if (typeof argv.t !== 'string') {
    console.error('Invalid search terms. Use "-t "here comes the terms".');
    process.exit(-1);
  }

  const dir = argv.d;
  const n = Number(argv.n);
  const p = Number(argv.p);
  const tt = argv.t.split(' ').filter(t => !!t);
  const tfs_func = tfsVariants[argv.tf];
  const idfs_func = idfsVariants[argv.idf];

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

  if (!tfs_func) {
    console.error(`Unknown -tf function ${argv.tf}. Supported functions are [${Object.keys(tfsVariants).join(', ')}]`);
    process.exit(-1);
  }

  if (!idfs_func) {
    console.error(`Unknown -idf function ${argv.idf}. Supported functions are [${Object.keys(idfsVariants).join(', ')}]`);
    process.exit(-1);
  }

  if (!tt || tt.length < 1) {
    console.error('Invalid search terms. Use "-t "here comes the terms".');
    process.exit(-1);
  }

  // ok, let's begin
  module.exports.run(dir, n, p, tt, tfs_func, idfs_func, tfIdfVariants.default);
}