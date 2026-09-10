import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateOpportunityScore,
  rankOpportunities
} from '../src/commercial-engine.js';

test('calculates a high priority opportunity', () => {
  const result = calculateOpportunityScore({
    demand: 100,
    acceptance: 100,
    conversion: 100,
    economics: 100,
    competition: 100,
    operations: 100
  });

  assert.equal(result.score, 100);
  assert.equal(result.status, 'HIGH_PRIORITY');
});

test('classifies medium opportunities as candidates', () => {
  const result = calculateOpportunityScore({
    demand: 70,
    acceptance: 70,
    conversion: 70,
    economics: 70,
    competition: 70,
    operations: 70
  });

  assert.equal(result.score, 70);
  assert.equal(result.status, 'CANDIDATE');
});

test('low data quality limits the score', () => {
  const result = calculateOpportunityScore({
    demand: 100,
    acceptance: 100,
    conversion: 100,
    economics: 100,
    competition: 100,
    operations: 100,
    dataQuality: 40
  });

  assert.equal(result.score, 59);
});

test('high regulatory risk makes opportunity ineligible', () => {
  const result = calculateOpportunityScore({
    demand: 100,
    acceptance: 100,
    conversion: 100,
    economics: 100,
    competition: 100,
    operations: 100,
    regulatoryRisk: 'high'
  });

  assert.equal(result.score, 0);
  assert.equal(result.status, 'INELIGIBLE');
  assert.equal(result.reason, 'high_regulatory_risk');
});

test('margin below minimum makes opportunity ineligible', () => {
  const result = calculateOpportunityScore({
    demand: 100,
    acceptance: 100,
    conversion: 100,
    economics: 100,
    competition: 100,
    operations: 100,
    margin: 10,
    minMargin: 20
  });

  assert.equal(result.score, 0);
  assert.equal(result.status, 'INELIGIBLE');
  assert.equal(result.reason, 'margin_below_minimum');
});

test('ranks opportunities from highest to lowest score', () => {
  const products = [
    {
      name: 'Produto A',
      signals: {
        demand: 50,
        acceptance: 50,
        conversion: 50,
        economics: 50,
        competition: 50,
        operations: 50
      }
    },
    {
      name: 'Produto B',
      signals: {
        demand: 100,
        acceptance: 100,
        conversion: 100,
        economics: 100,
        competition: 100,
        operations: 100
      }
    }
  ];

  const result = rankOpportunities(products);

  assert.equal(result[0].name, 'Produto B');
  assert.equal(result[0].opportunity.score, 100);
  assert.equal(result[1].name, 'Produto A');
  assert.equal(result[1].opportunity.score, 50);
});
