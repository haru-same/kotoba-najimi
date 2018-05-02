const ReviewTable = require('./review-table-base');

const factTableName = "kanji-facts";
const stateTableName = "kanji-review-states";

class KanjiReviewTable extends ReviewTable {

}

module.exports = new KanjiReviewTable('kanji', factTableName, stateTableName);