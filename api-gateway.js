const getApiIdFromRemote = async serverless => {
    const { provider, service } = serverless.service
    const { aws } = serverless.providers
    const { stage, stackName } = provider
    
    const credentials = aws.getCredentials()
    const apiGateway = new aws.sdk.APIGateway(credentials)

    const apis = await apiGateway.getRestApis().promise()
    const [api] = apis.items.filter(api => api.name === `${stage}-${service}`)

    if (!api || !api.id) {
        throw new Error(`Error: No RestApiId associated with CloudFormation stack ${stackName}`);
    }

    return api.id
}

const getApiId = serverless => {
    if (serverless.service.provider.apiGateway && serverless.service.provider.apiGateway.restApiId) {
        return Promise.resolve(serverless.service.provider.apiGateway.restApiId)
    }

    return getApiIdFromRemote(serverless)
}

const getStageVariables = async serverless => {
    const credentials = serverless.providers.aws.getCredentials()
    const apiGateway = new serverless.providers.aws.sdk.APIGateway(credentials)

    const apiId = await getApiId(serverless)

    const stage = await apiGateway
        .getStage({
            restApiId: apiId,
            stageName: serverless.service.provider.stage
        }).promise()

    return stage['variables'] || { }
}

const updateStageVariable = async (serverless, options) => {
    const { key, value } = options

    const credentials = serverless.providers.aws.getCredentials()
    const apiGateway = new serverless.providers.aws.sdk.APIGateway(credentials)

    const stageVariables = await getStageVariables(serverless)
    const apiId = await getApiId(serverless)

    if (value === undefined || value === null) {
        delete stageVariables[key]
    } else {
        stageVariables[key] = value
    }

    return apiGateway
        .updateStage({
            restApiId: apiId,
            stageName: serverless.service.provider.stage,
            patchOperations: [{
                op: 'replace',
                path: `/variables/${key}`,
                value
            }]
        }).promise()
}

module.exports.list = async (serverless, options) => {
    const stageVariables = await getStageVariables(serverless)

    serverless.cli.log('API Gateway Stage Variables:')

    if (Object.keys(stageVariables).length > 0) {
        Object.keys(stageVariables).forEach(key => {
            serverless.cli.log(`  - ${key}: ${stageVariables[key]}`)
        })
    }
    else {
        serverless.cli.log(`  - no stage variables defined`)
    }
}

module.exports.set = async (serverless, options) => {
    await updateStageVariable(serverless, options)

    if (options.value) {
        serverless.cli.log(`New Stage Variable: ${options.key}:${options.value}`)
    }
    else {
        serverless.cli.log(`Deleted Stage Variable: ${options.key}`)
    }
}