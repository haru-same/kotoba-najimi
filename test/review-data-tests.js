const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const reviewData = require('../libs/review-data');

const TEST_DECK_NAME = "test";
const getFactForTarget = (target) => {
	const deck = reviewData.getDeck(TEST_DECK_NAME);
	return deck.find('target', target);
};

describe('review-data', () => {
	before(() => {
		reviewData.deleteDeck(TEST_DECK_NAME);
	});

	describe('#createFact()', () => {
		it('should throw an error and fail to create a fact when type is invalid', () => {
			assert.throw(() => reviewData.createFact(TEST_DECK_NAME, -1, {}));
		});

		it('should throw an error and fail to create a fact when data does not match template', () => {
			assert.throw(() => reviewData.createFact(TEST_DECK_NAME, 1, { target: "abc" }));
		});

		it('should create a fact when data is provided', () => {
			reviewData.createFact(TEST_DECK_NAME, 1, { target: "the", "context": "the cow is", "reading": "cow" });
			assert.notEqual(getFactForTarget("the"), null);
		});
	});
});