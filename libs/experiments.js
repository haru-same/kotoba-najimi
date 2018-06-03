const fs = require('fs');
const glob = require('glob');

const userdata = require('./userdata');
const config = require('./config');
const util = require('./util');

const folderName = config.userdataPath + '/experiment';

const experiments = {};

glob(`${folderName}/*.json`, (err, files) => {
	for(const f of files){
		const experiment = JSON.parse(fs.readFileSync(f, 'utf8'));
		if(!experiments[experiment.type]) experiments[experiment.type] = {};
		experiments[experiment.type][experiment.name] = experiment;
	}

	console.log(experiments);
});

const createExperiment = (type, name, conditions) => {
	console.log('making exp');
	const experiment = {
		type: type,
		name: name,
		conditions: [],
		created: new Date().getTime(),
		active: false
	};
	for(let i = 0; i < parseInt(conditions); i++){
		experiment.conditions.push({ mode: i });
	}
	fs.writeFileSync(`${folderName}/${name}.json`, JSON.stringify(experiment, null, '\t'));
};

const getActiveExperiments = (type) => {
	const experimentList = [];
	for(const id in experiments[type]){
		console.log(id);
		if(experiments[type][id].active) experimentList.push(experiments[type][id]);
	}
	return experimentList;
}

const assignExperimentConditions = (type, states, state) => {
	const activeExperiments = getActiveExperiments(type);
	console.log(activeExperiments);
	for(const exp of activeExperiments){
		let counts = [];
		for(let i = 0; i < exp.conditions.length; i++) counts.push(0);

		for(const id in states){
			if(states[id].experiments && !states[id]['ignore-experiment'] && states[id].experiments[exp.name] != null) {
				counts[states[id].experiments[exp.name]]++;
			}
		}

		let min = 10000000;
		for(let i = 0; i < counts.length; i++){
			if(counts[i] < min) min = counts[i];
		}
		const mins = [];
		for(let i = 0; i < counts.length; i++){
			if(counts[i] == min) mins.push(i);
		}

		if(!state.experiments) state.experiments = {};
		const condition = util.randomFromArray(mins);
		state.experiments[exp.name] = condition;
		console.log(state);
	}
}

module.exports.createExperiment = createExperiment;
module.exports.assignExperimentConditions = assignExperimentConditions;