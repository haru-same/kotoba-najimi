const conjugation = require('jp-conjugation');

const verb = "加える";
console.log(conjugation.unconjugate(verb));
console.log(conjugation.conjugate(verb, 'v1'));

console.log();
for (const conj of conjugation.conjugate(verb, 'v1')) {
	if (conj.name == 'past tense') console.log(conj);	
}