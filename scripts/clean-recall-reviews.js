const userdata = require('../libs/userdata');

const factTableName = "recall-facts";
const stateTableName = "recall-review-states";

const factsTable = userdata.getTable(factTableName);

for(const key in factsTable.data){
	if(factsTable.data[key].word){
		factsTable.data[key].type = 3;
	}
}

userdata.saveTable(factsTable);