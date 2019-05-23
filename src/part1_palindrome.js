const minimist = require('minimist');

function isPalindromeSanitized(input) {
    for (let i = 0, j = input.length - 1; i < j; i++ , j--) {
        if (input[i] !== input[j]) return false;
    }
    return true;
}

function isPalindrome(input) {
    if (input === undefined || input === null || (typeof input !== 'string')) return false;
    // Sanitized input:
    // - No white spaces
    // - No other characters than alphanumeric ones
    // - Case insensitive
    return isPalindromeSanitized(input.replace(/[^a-zA-Z0-9]/g, '').toLowerCase());
}

module.exports = {
    isPalindrome: isPalindrome
};

// command-line execution
if (require.main === module) {
    const argv = minimist(process.argv.slice(2));
    if (argv.test) {
        // Test mode
        const test_inputs = {
            'test   x tset': true,
            'not a palindrome': false,
            'palindromewithevenlengthhtgnelnevehtiwemordnilap': true,
            'palindromewithoddlengthxhtgnelddohtiwemordnilap': true,
            '': true,
            '12321': true,
            'Aliquam scelerisque ipsum et massa interdum, sit amet vulputate urna ornare. Vivamus vitae lorem scelerisque, consectetur nunc quis, ultrices eros. Vestibulum ut dapibus justo. Ut a est sed ligula cursus condimentum ut eu orci. Duis dictum magna at sapien vulputate molestie. Sed a arcu at nisl placerat lobortis in vel enim. Mauris fermentum mi sed tempus iaculis. Mauris non dolor ac neque pharetra vulputate. Integer eleifend purus ac nunc auctor, et euismod ligula feugiat. Sed eleifend mauris vel venenatis venenatis. Mauris sed ante sed tellus.': false,
            'a': true
        };

        let successes = [], failures = [];
        console.time('elapsed time (tests)');
        Object.keys(test_inputs).forEach(input => {
            if (module.exports.isPalindrome(input) !== test_inputs[input]) {
                failures.push(input);
            } else {
                successes.push(input);
            }
        });
        console.timeEnd('elapsed time (tests)');

        console.log(`${Object.keys(test_inputs).length} tests run`);
        console.log(`${successes.length} successful tests`);
        console.log(`${failures.length} failed tests`);
        if (failures.length > 0) {
            console.log('');
            console.log('Failed inputs:');
            failures.forEach(input => console.log(`> ${input}`));
        }
    } else {
        // Normal execution mode
        let input = argv._.join(' ');
        console.time('elapsed time');
        const result = module.exports.isPalindrome(input);
        console.timeEnd('elapsed time');

        console.log();
        console.log('Input:\t\t\t', input);
        console.log('Is palindrome?\t\t', result);
    }
}