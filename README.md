# Part 1: Palindromes

### Examples

* node src/part1_palindrome.js this is an input example
* node src/part1_palindrome.js --test

### Parameters

* **-test**: Launches the program in a special test mode that validates a predefined set of inputs and outputs the elapsed time. Any other parameter will be ignored.

# Part 2: K-complementary pairs

### Examples

* node src/part2_kpairs.js --k=10 --l="1 2 3 4 5 6 7 8 9"
* node src/part2_kpairs.js --slow --k=10 --l "1 2 3 4 5 6 7 8 9"
* node src/part2_kpairs.js --test

### Parameters

* *--k*: K target value for the K-complimentary pairs.
* *--l*: Whitespace separated list of integer values.
* *--slow*: Use slow algorithm instead of the default one.
* *--test*: Launches the program in a special test mode that compares the slow and fast algorithms with random inputs of increasing size. Any other parameter will be ignored.

# Part 3: Term-frequency daemon

### Examples

* node src/part3_freqdaemon.js -d ./resources/docs -n 10 -p 10 --tf freq --idf smooth -t "donald trump"

### Parameters

* *-d*: Path to the target folder to be watched.
* *-n*: Amount of top documents to show on each ranking display.
* *-p*: Amount of seconds between ranking displays.
* *--tf*: Version of tf(t,d) function to use. Accepted values are "raw", "freq" and "log".
* *--idf*: Version of idf(t,D) function to use. Accepted values are "standard" and "smooth".
* *-t*: List of terms to analyze, separated with blank spaces.