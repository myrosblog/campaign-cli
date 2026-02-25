import fs from "fs-extra";
import path from "node:path";
import CampaignError from "./CampaignError.js";

/**
 * Key for default configuration in campaign config
 * @constant {string}
 * @private
 */
const CONFIG_DEFAULT_KEY = "default";

/**
 * Campaign Instance class for interacting with ACC instances.
 * Handles data checking, pulling, and downloading from ACC schemas.
 *
 * @class CampaignInstance
 * @classdesc Class for managing data operations with ACC instances
 */
class CampaignInstance {
  /**
   * Creates a new CampaignInstance.
   *
   * @param {Object} client - Authenticated ACC client
   * @param {Object} campaignConfig - Configuration object defining schemas and download options
   * @param {Object} campaignConfig.default - Default configuration for all schemas
   * @param {Object} [campaignConfig.*] - Schema-specific configurations
   *
   * @example
   * const instance = new CampaignInstance(client, {
   *   default: { filename: "%schema%_%name%.xml" },
   *   "nms:recipient": { filename: "recipient_%name%.xml" }
   * });
   */
  constructor(client, campaignConfig) {
    this.client = client;
    this.campaignConfig = campaignConfig;
    /**
     * Array of schema names to process (excluding default config)
     * @type {string[]}
     */
    this.schemas = Object.keys(this.campaignConfig).filter(
      (key) => key !== CONFIG_DEFAULT_KEY,
    );

    this.client.registerObserver({
      onSOAPCall: (soapCall, safeRequestData) => {
        // this.saveArchiveRequest(soapCall.request.data);
      },
      onSOAPCallSuccess: (soapCall, safeResponseData) => {
        // this.saveArchiveResponse(soapCall.response);
      },
      onSOAPCallFailure: (soapCall, error) => {
        // this.saveArchiveResponse(soapCall.response);
      },
    });
  }

  /**
   * Gets query definition for a specific schema, merging with default config.
   *
   * @param {string} schema - Schema name (e.g., 'nms:recipient')
   * @param {Object} baseQueryDef - Base query definition
   * @returns {Object} Merged query definition
   *
   * @example
   * const queryDef = instance._getQueryDefForSchema('nms:recipient', {
   *   schema: 'nms:recipient',
   *   operation: 'count'
   * });
   */
  _getQueryDefForSchema(schema, baseQueryDef) {
    const config = this.campaignConfig[schema]
      ? this.campaignConfig[schema]
      : this.campaignConfig[CONFIG_DEFAULT_KEY];
    const configQueryDef = config.queryDef ? config.queryDef : {};

    return {
      ...baseQueryDef,
      ...configQueryDef,
    };
  }

  /**
   * Checks an ACC instance by counting records in each schema.
   * Validates that the download path is available.
   *
   * @param {string} downloadPath - Path where data would be downloaded
   * @returns {Promise<void>} Resolves when check is complete
   * @throws {CampaignError} Throws if download path is not empty
   *
   * @example
   * await instance.check('/path/to/download');
   */
  async check(downloadPath) {
    console.log("📡 Checking instance...");

    for (const schema of this.schemas) {
      const baseQueryDef = { schema: schema, operation: "count" };
      const queryDef = this._getQueryDefForSchema(schema, baseQueryDef);
      const query = this.client.NLWS.xtkQueryDef.create(queryDef);

      let message = "";
      try {
        const records = await query.executeQuery();
        message = `${records.count} found.`;
      } catch (err) {
        message = `⚠️ Error executing query: ${err.message}.`;
      } finally {
        console.log(`- ${schema}: ` + message);
      }
    }

    console.log(`📂 Will be downloaded to ${downloadPath}`);

    if (!this.isFolderEmpty(downloadPath)) {
      throw new CampaignError(
        `Directory already exists and is not empty. Please choose an empty directory or a different path.`,
      );
    }
  }

  /**
   * Pulls data from all schemas in the ACC instance.
   * Implements pagination to handle large datasets.
   *
   * @param {string} downloadPath - Path where data will be downloaded
   * @returns {Promise<void>} Resolves when pull operation is complete
   *
   * @example
   * await instance.pull('/path/to/download');
   */
  async pull(downloadPath) {
    console.log(`✨ Pulling instance to ${downloadPath}...`);
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }

    if (!this.isFolderEmpty(downloadPath)) {
      //   throw new CampaignError(
      //     `Directory already exists and is not empty. Please choose an empty directory or a different path.`,
      //   );
    }

    for (const schema of this.schemas) {
      console.log(`- Schema ${schema}`);

      const lineCount = 10;
      let startLine = 1;
      let recordsLength = 0;
      do {
        console.log(
          `  Downloading lines ${startLine} to ${startLine + lineCount - 1}...`,
        );
        recordsLength = await this.download(schema, downloadPath, startLine);
        startLine += lineCount;
      } while (recordsLength >= lineCount);
    }
  }

  /**
   * Downloads records from a specific schema and saves them as XML files.
   *
   * @param {string} schema - Schema name to download
   * @param {string} folderPath - Path where files will be saved
   * @param {number} startLine - Starting line number for pagination
   * @returns {Promise<number>} Number of records downloaded
   *
   * @example
   * const count = await instance.download('nms:recipient', '/path/to/save', 1);
   */
  async download(schema, folderPath, startLine) {
    const DomUtil = this.client.DomUtil;

    const baseQueryDef = {
      schema: schema,
      operation: "select",
      select: {
        node: [{ expr: "data" }],
      },
      startLine: startLine,
      lineCount: 10, // @todo pagination
    };
    const queryDef = this._getQueryDefForSchema(schema, baseQueryDef);
    const queryDefXml = this.client.DomUtil.fromJSON(
      "queryDef",
      queryDef,
      "SimpleJson",
    );

    const query = this.client.NLWS.xml.xtkQueryDef.create(queryDefXml);

    const config = this.campaignConfig[schema]
      ? this.campaignConfig[schema]
      : this.campaignConfig[CONFIG_DEFAULT_KEY];
    const configFilename = config.filename;

    let message = "";
    var recordsLength = 0;
    try {
      await query.selectAll(false); // @see https://opensource.adobe.com/acc-js-sdk/xtkQueryDef.html
      const records = await query.executeQuery(); // DOMDocument <srcSchema-collection><srcSchema></srcSchema>...
      var child = DomUtil.getFirstChildElement(records);
      // @see https://opensource.adobe.com/acc-js-sdk/domHelper.html
      while (child) {
        recordsLength++;

        const namespace = DomUtil.getAttributeAsString(child, "namespace");
        const name = DomUtil.getAttributeAsString(child, "name");
        const internalName = DomUtil.getAttributeAsString(
          child,
          "internalName",
        );
        const filename = configFilename
          .replace("%namespace%", namespace)
          .replace("%name%", name)
          .replace("%internalName%", internalName)
          .replace("%schema%", schema.replace(":", "_"));
        const filepath = path.join(folderPath, filename);
        const data = DomUtil.toXMLString(child);
        fs.outputFileSync(filepath, data);
        console.log(`  /${filename}`);

        child = DomUtil.getNextSiblingElement(child);
      }

      message = `${recordsLength} saved.`;
    } catch (err) {
      message = `⚠️ Error executing query: ${err.message}.`;
    } finally {
      console.log(`- ${schema}: ` + message);
    }
    return recordsLength;
  }

  /**
   * Checks if a folder is empty or doesn't exist.
   *
   * @param {string} path - Path to check
   * @returns {boolean} True if folder is empty or doesn't exist, false otherwise
   *
   * @example
   * if (instance.isFolderEmpty('/path/to/check')) {
   *   // Folder is empty or doesn't exist
   * }
   */
  isFolderEmpty(path) {
    return !fs.existsSync(path) || fs.readdirSync(path).length === 0;
  }

  /**
   * Saves SOAP request to archive file with timestamp.
   *
   * @param {string} rawRequest - Raw SOAP request XML
   * @returns {void}
   *
   * @example
   * instance.saveArchiveRequest('<soap:Envelope>...</soap:Envelope>');
   */
  saveArchiveRequest(rawRequest) {
    const archiveRequest =
      "archives/" + this.getArchiveDate() + "-CampaignInstance-request.xml";
    fs.outputFileSync(archiveRequest, rawRequest, function (errFs) {
      throw errFs;
    });
  }

  /**
   * Saves SOAP response to archive file with timestamp.
   *
   * @param {string} rawResponse - Raw SOAP response XML
   * @returns {void}
   *
   * @example
   * instance.saveArchiveResponse('<soap:Envelope>...</soap:Envelope>');
   */
  saveArchiveResponse(rawResponse) {
    const archiveResponse =
      "archives/" + this.getArchiveDate() + "-CampaignInstance-response.xml";
    fs.outputFileSync(archiveResponse, rawResponse, function (errFs) {
      throw errFs;
    });
  }

  /**
   * Generates timestamp string for archive files in format: YYYY/MM/DD/HH-mm-ss_ms
   *
   * @returns {string} Formatted timestamp string
   *
   * @example
   * const timestamp = instance.getArchiveDate(); // "2023/01/15/14-30-45_123"
   */
  getArchiveDate() {
    var ts_hms = new Date();

    return (
      ts_hms.getFullYear() +
      "/" +
      ("0" + (ts_hms.getMonth() + 1)).slice(-2) +
      "/" +
      ("0" + ts_hms.getDate()).slice(-2) +
      "/" +
      ("0" + ts_hms.getHours()).slice(-2) +
      "-" +
      ("0" + ts_hms.getMinutes()).slice(-2) +
      "-" +
      ("0" + ts_hms.getSeconds()).slice(-2) +
      "_" +
      ts_hms.getMilliseconds()
    );
  }
}

export default CampaignInstance;
