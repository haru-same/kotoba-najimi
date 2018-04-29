const readline = require('readline');

const experiments = require('../libs/experiments');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

let type = -1;
let name = "";
let conditions = 0;

const getType = () => {
	return new Promise((resolve, reject) => {
		rl.question('enter type: ', (answer) => {
			type = answer;
			console.log(`type: ${type}`);
			resolve();
		});
	});
};

const getName = () => {
	return new Promise((resolve, reject) => {
		rl.question('enter name: ', (answer) => {
			name = answer;
			console.log(`name: ${name}`);
			resolve();
		});
	});
};

const getConditions = () => {
	return new Promise((resolve, reject) => {
		rl.question('enter conditions: ', (answer) => {
			conditions = answer;
			console.log(`conditions: ${conditions}`);
			resolve();
		});
	});
};

const main = async () => {
	await getType();
	await getName();
	await getConditions();
	experiments.createExperiment(type, name, conditions);
	rl.close();
};

main();