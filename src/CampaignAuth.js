import CampaignError from "./CampaignError.js";

/**
 * @class CampaignCli
 */
class CampaignCli {
  INSTANCES_KEY = "instances";

  /**
   * @param {acc-js-sdk} sdk
   * @param {Configstore} config
   * @throws {CampaignError}
   */
  constructor(sdk, config) {
    if (!sdk || !config) {
      throw new CampaignError(
        "SDK and Configstore instances are required to initialize CampaignCli.",
      );
    }
    this.sdk = sdk;
    this.config = config;
    this.instances = config.get(this.INSTANCES_KEY) || {};
    this.instanceIds = Object.keys(this.instances);
    console.log(
      `🏠 CampaignCli initialized with SDK ${this.sdk.getSDKVersion().version} and config ${this.config.path}`,
    );
  }

  /**
   * @param {*} options
   * @returns {Promise<void>}
   * @throws {CampaignError}
   */
  async init(options) {
    if (this.instanceIds.includes(options.alias)) {
      throw new CampaignError(
        `Instance with alias ${options.alias} already exists. Please choose a different alias.`,
      );
    }
    const { alias, host, user, password } = options;
    this.config.set(`${this.INSTANCES_KEY}.${alias}`, { host, user, password });
    console.log(`✅ Instance ${alias} added successfully.`);
    return this.login({ alias: alias });
  }

  /**
   * @param {*} options
   * @returns {Promise<Client>}
   * @throws {CampaignError}
   */
  async login(options) {
    const { host, user, password } =
      this.config.get(`instances.${options.alias}`) || {};
    if (!host || !user || !password) {
      throw new CampaignError(
        `Instance with alias "${options.alias}" doesn't exist.`,
      );
    }
    console.log(`↔️ Connecting ${user}@${host}...`);
    const connectionParameters =
      this.sdk.ConnectionParameters.ofUserAndPassword(host, user, password);
    const client = await this.sdk.init(connectionParameters);
    await client.logon();
    const serverInfo = client.getSessionInfo().serverInfo;
    if (!serverInfo) {
      throw new CampaignError(`Unable to get server info.`);
    }
    console.log(
      `✅ Logged in to ${serverInfo.instanceName} (${serverInfo.releaseName} build ${serverInfo.buildNumber}) successfully.`,
    );
    return client;
  }

  /**
   * @returns {void}
   */
  list() {
    console.log(`📚 Reading ${this.instanceIds.length} instance(s)`);
    for (const [key, value] of Object.entries(this.instances)) {
      console.log(`  - "${key}": ${value.user}@${value.host}`);
    }
  }
}

export default CampaignCli;
