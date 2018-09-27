const ReviewTable = require('./review-table-base');

const factTableName = "respeak-facts";
const stateTableName = "respeak-review-states";

class ReSpeakReviewTable extends ReviewTable {
}

module.exports = new ReSpeakReviewTable('respeak', factTableName, stateTableName);