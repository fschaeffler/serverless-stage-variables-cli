# serverless-stage-variables-cli

## installation

- install dependency via `npm install serverless-stage-variables-cli --save-dev`
- add `serverless-stage-variables-cli` to the `serverless.yml`

## usage

- list all stage variables: `sls list-stage-vars`

- add stage variable: `sls set-stage-var --key 'TEST_VAR' --value 'TEST_VALUE'`

- remove stage variable: `sls set-stage-var --key 'TEST_VAR'`