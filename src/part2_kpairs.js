const minimist = require('minimist');

/**
 * Slow algorithm with O(N^2) processing cost.
 */
function findKPairs_slow(K, input) {
  let pairs = [];
  for (let i = 0; i < input.length - 1; i++) {
    for (let j = i + 1; j < input.length; j++) {
      if (input[i] + input[j] === K) {
        pairs.push([i, j]);
      }
    }
  }
  return pairs;
}

/**
 * Faster algorithm with O(N) processing cost.
 */
function findKPairs_fast(K, input) {
  let pairs = [];
  let indexesByValue = {};
  input.forEach((val, index) => {
    indexesByValue[val] = indexesByValue[val] || [];
    indexesByValue[val].push(index);
  });

  Object.keys(indexesByValue).forEach(val => {
    const targetVal = K - val;
    if (indexesByValue[targetVal]) {
      indexesByValue[val].forEach(i => {
        indexesByValue[targetVal].forEach(j => {
          if (i < j) { // avoid repeated!
            pairs.push([i, j]);
          }
        });
      })
    }
  });

  return pairs;
}

module.exports = {
  findKPairs_slow: findKPairs_slow,
  findKPairs_fast: findKPairs_fast
};



// command-line execution
if (require.main === module) {
  const argv = minimist(process.argv.slice(2));
  if (argv.test) {
    // Test mode
    let SIZES = [20, 100, 1000, 10000, 100000];
    SIZES.forEach(size => {
      // create an array of numbers between -SIZE and SIZE
      let list = new Array(size);
      for (let i = 0; i < list.length; i++) {
        list[i] = Math.floor(Math.random() * (size * 2 - 1) - size);
      }
      // choose a random K between -SIZE and SIZE
      let K = Math.floor(Math.random() * (size * 2 - 1) - size);
      console.time(`Elapsed time (type: slow, N: ${size})`);
      const result_slow = module.exports.findKPairs_slow(K, list);
      console.timeEnd(`Elapsed time (type: slow, N: ${size})`);
      console.time(`Elapsed time (type: fast, N: ${size})`);
      const result_fast = module.exports.findKPairs_fast(K, list);
      console.timeEnd(`Elapsed time (type: fast, N: ${size})`);
      if (result_slow.length !== result_fast.length) {
        console.log(`Results do not match for size ${size}`);
      }
    });
  } else {
    // Normal execution mode
    const rawInput = argv.l;
    const k = Number(argv.k);
    const slow = argv.slow;

    if (isNaN(k)) {
      console.error('Invalid k value. Use "-k [val]" with val being an integer.');
      process.exit(-1);
    }

    console.log(argv);
    console.log('raw', rawInput, typeof rawInput);

    if (!rawInput || (typeof rawInput !== 'string')) {
      console.error('No input list or invalid one. Use -l "a b c d e f g h" using integer values.')
      process.exit(-1);
    }

    // convert space-separated string into number array
    const input = rawInput.split(' ').filter(x => x !== '').map(Number);

    if (input.findIndex(x => isNaN(x)) >= 0) {
      console.error('Input list includes some non-numeric value.');
      process.exit(-1);
    }

    const func = slow ? module.exports.findKPairs_slow : module.exports.findKPairs_fast;

    console.time('elapsed time');
    const result = func(k, input);
    console.timeEnd('elapsed time');

    console.log();
    console.log(`K-pairs (K=${k}):`);
    result && result.forEach(pair => console.log(`> [${pair[0]} , ${pair[1]}]`));
  }
}