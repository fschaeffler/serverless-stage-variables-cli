class ServerlessPlugin {
	constructor(serverless, options) {
		this.serverless = serverless;
		this.options = options;

		this.commands = {
			'list-stage-vars': {
				usage: 'Lists all set API Gatway stage variable',
				lifecycleEvents: ['list-stage-vars']
			},
			'set-stage-var': {
				usage: 'Adds or updates a API Gatway stage variable',
				lifecycleEvents: ['set-stage-var'],
				options: {
					key: {
						usage: 'Key of the stage variable',
						required: true
					},
					value: {
						usage: 'Value of the stage variable',
						required: false
					}
				}				
			}
		}

		this.hooks = {
			'list-stage-vars:list-stage-vars': this.listStageVars.bind(this),
			'set-stage-var:set-stage-var': this.setStageVar.bind(this)
		}
	}

	async getApiIdFromRemote () {
		const stackName = `${this.stage}-${this.service}`

		const apis = await this.apiGateway.getRestApis().promise()
		const [api] = apis.items.filter(api => api.name === stackName)
	
		if (!api || !api.id) {
			throw new Error(`Error: No RestApiId associated with CloudFormation stack ${stackName}`);
		}
	
		return api.id
	}
	
	getApiId () {
		if (this.serverless.service.provider.apiGateway && this.serverless.service.provider.apiGateway.restApiId) {
			return Promise.resolve(this.serverless.service.provider.apiGateway.restApiId)
		}
	
		return this.getApiIdFromRemote(this.serverless)
	}
	
	async getStageVariables () {
		const stage = await this.apiGateway
			.getStage({
				restApiId: this.apiId,
				stageName: this.stage
			}).promise()
	
		return stage['variables'] || { }
	}
	
	async updateStageVariable () {
		const { key, value } = this.options

		const stageVariables = await this.getStageVariables()
	
		if (value === undefined || value === null) {
			delete stageVariables[key]
		} else {
			stageVariables[key] = value
		}
	
		return this.apiGateway
			.updateStage({
				restApiId: this.apiId,
				stageName: this.stage,
				patchOperations: [{
					op: 'replace',
					path: `/variables/${key}`,
					value
				}]
			}).promise()
	}

	async init () {
		const credentials = this.serverless.providers.aws.getCredentials()
		this.apiGateway = new this.serverless.providers.aws.sdk.APIGateway(credentials)

		this.stage = this.serverless.service.provider.stage
		this.service = this.serverless.service.service
		this.apiId = await this.getApiId(this.serverless)
	}
	
	async listStageVars () {
		await this.init()
		const stageVariables = await this.getStageVariables()
		this.serverless.cli.log('API Gateway Stage Variables:')
	
		if (Object.keys(stageVariables).length > 0) {
			Object.keys(stageVariables).forEach(key => {
				this.serverless.cli.log(`  - ${key}: ${stageVariables[key]}`)
			})
		}
		else {
			this.serverless.cli.log(`  - no stage variables defined`)
		}
	}
	
	async setStageVar () {
		await this.init()
		await this.updateStageVariable(this.serverless, this.options)
	
		if (this.options.value) {
			this.serverless.cli.log(`New Stage Variable: ${this.options.key}:${this.options.value}`)
		}
		else {
			this.serverless.cli.log(`Deleted Stage Variable: ${this.options.key}`)
		}
	}
}

module.exports = ServerlessPlugin
