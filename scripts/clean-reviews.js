const userdata = require('../libs/userdata');

const factTableName = "kanji-facts";
const stateTableName = "kanji-review-states";

const factsTable = userdata.getTable(factTableName);

for(const key in factsTable.data){
	if(!factsTable.data[key].type){
		factsTable.data[key].type = 1;
	}
}

userdata.saveTable(factsTable);