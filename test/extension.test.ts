//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as batch from '../src/batch';
import * as duration from '../src/duration';

const nonJson = " \
  id : 'wonderjob' \
  poolInfo \
      poolId : 'wonderpool' \
";

const jobJson = ' \
{ \
  "id" : "wonderjob", \
  "poolInfo" : { \
      "poolId" : "wonderpool" \
  } \
} \
';

const jobTemplateJson = ' \
{ \
  "parameters": { \
    "jobId": { \
      "type": "string", \
      "metadata": { \
        "description": "The id of the Batch job" \
      } \
    }, \
    "poolId": { \
      "type": "string", \
      "metadata": { \
        "description": "The id of the Batch pool on which to run the job" \
      } \
    }, \
    "testDefaulted": { \
      "type": "string", \
      "defaultValue" : "mydef" \
    }, \
    "testAllowed": { \
      "type": "string", \
      "allowedValues" : [ "alpha", "bravo", "charlie" ] \
    } \
  }, \
  "job": { \
    "type": "Microsoft.Batch/batchAccounts/jobs", \
    "apiVersion": "2016-12-01", \
    "properties": { \
      "id": "[parameters(\'jobId\')]", \
      "poolInfo" : { \
          "poolId" : "wonderpool" \
      } \
    } \
  } \
} \
';

const jobTemplateJsonNoParams = ' \
{ \
  "job": { \
    "type": "Microsoft.Batch/batchAccounts/jobs", \
    "apiVersion": "2016-12-01", \
    "properties": { \
      "id" : "wonderjob", \
      "poolInfo" : { \
          "poolId" : "wonderpool" \
      } \
    } \
  } \
} \
';

const poolTemplateJson = ' \
{ \
  "parameters": { \
    "vmSize": { \
      "type": "string", \
      "allowedValues" : [ "STANDARD_A3", "STANDARD_A4" ], \
      "metadata": { \
        "description": "The size of virtual machine to use" \
      } \
    } \
  }, \
  "pool": { \
    "type": "Microsoft.Batch/batchAccounts/pools", \
    "apiVersion": "2016-12-01", \
    "properties": { \
      "id": "superduperpool", \
      "vmSize": "[parameters(\'vmSize\')]", \
      "targetDedicated": 4, \
      "cloudServiceConfiguration": { "osFamily": 4 } \
    } \
  } \
} \
';

suite('Batch Utilities Tests', () => {

    test('Parsing a non-JSON document as a job template fails', () => {
        const result = batch.parseBatchTemplate(nonJson, 'job');
        assert.equal(result, null);
    });

    test('Parsing job JSON returns a non-template resource', () => {
        const result = batch.parseBatchTemplate(jobJson, 'job');
        assert.notEqual(result, null);
        if (result !== null) {
          assert.equal(result.isTemplate, false);
          assert.equal(result.parameters.length, 0);
        }
    });

    test('Parsing job template JSON returns a job resource template', () => {
        const template = batch.parseBatchTemplate(jobTemplateJson, 'job');
        assert.notEqual(template, null);
        if (template !== null) {
          assert.equal(template.isTemplate, true);
        }
    });

    test('Parsing job template JSON surfaces the parameters', () => {
        const template = <batch.IBatchResource>batch.parseBatchTemplate(jobTemplateJson, 'job');
        assert.equal(template.parameters.length, 4);
        
        const jobIdParameter = template.parameters[0];
        assert.equal('jobId', jobIdParameter.name);
        assert.equal('string', jobIdParameter.dataType);
        assert.notEqual(undefined, jobIdParameter.metadata);
        if (jobIdParameter.metadata) {
            assert.equal('The id of the Batch job', jobIdParameter.metadata.description);
        }
    });

    test('A job template can be parsed even if it has no parameters', () => {
        const template = <batch.IBatchResource>batch.parseBatchTemplate(jobTemplateJsonNoParams, 'job');
        assert.equal(template.parameters.length, 0);
    });

    test('Parsing job template JSON captures default values', () => {
        const template = <batch.IBatchResource>batch.parseBatchTemplate(jobTemplateJson, 'job');
        
        const parameter = template.parameters.find((p) => p.name == 'testDefaulted');

        assert.notEqual(undefined, parameter);
        if (parameter) {
            assert.equal('mydef', parameter.defaultValue);
        }
    });

    test('Parsing job template JSON captures allowed values', () => {
        const template = <batch.IBatchResource>batch.parseBatchTemplate(jobTemplateJson, 'job');
        
        const parameter = template.parameters.find((p) => p.name == 'testAllowed');

        assert.notEqual(undefined, parameter);
        if (parameter) {
            assert.notEqual(undefined, parameter.allowedValues);
            if (parameter.allowedValues) {
                assert.equal(3, parameter.allowedValues.length);
                assert.equal('alpha', parameter.allowedValues[0]);
            }
        }
    });

    test('Parsing pool template JSON surfaces the parameters', () => {
        const template = <batch.IBatchResource>batch.parseBatchTemplate(poolTemplateJson, 'pool');
        assert.equal(template.parameters.length, 1);
        
        assert.equal('vmSize', template.parameters[0].name);
    });
});

suite('Duration Parsing Tests', () => {

    test('Parsing a plain time succeeds', () => {
        assert.equal('PT5H', duration.toISO8601('5:00:00'));
        assert.equal('PT10M', duration.toISO8601('0:10:00'));
        assert.equal('PT30S', duration.toISO8601('0:00:30'));
        assert.equal('PT45H10M30S', duration.toISO8601('45:10:30'));
        assert.equal('PT45H10M30.5S', duration.toISO8601('45:10:30.50'));
    });

    test('Parsing a time containing days succeeds', () => {
        assert.equal('P1DT5H', duration.toISO8601('1 day, 5:00:00'));
        assert.equal('P15DT45H10M30.5S', duration.toISO8601('15 days, 45:10:30.50'));
    });

    test('Parsing a zero time succeeds', () => {
        assert.equal('PT0S', duration.toISO8601('0:00:00'));
    });

    test('Parsing a MaxValue time returns nothing', () => {
        assert.equal(undefined, duration.toISO8601('10675199 days, 2:48:05.477581'));
    });

});