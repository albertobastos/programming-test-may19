const terms = ["abc", "def", "123"];
const input = "this is a test input with abc, def but not 12something";

function test(iter, input, term) {
  console.time(iter);
  input.match(new RegExp(`\\b${term}\\b`, "ig"));
  console.timeEnd(iter);
}

for (let i = 0; i < 10; i++) {
  terms.forEach(term => test(i, input, term));
}
