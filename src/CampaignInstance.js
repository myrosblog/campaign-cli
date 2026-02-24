import fs from "fs-extra";
import path from "node:path";
import CampaignError from "./CampaignError.js";

const CONFIG_DEFAULT_KEY = "default";
const configs = {
  // XTK
  // "xtk:srcSchema": {
  //   filename: `/Administration/Configuration/Data schemas/%namespace%/%name%.html`,
  // },
  // "xtk:form": {
  //   filename: `/Administration/Configuration/Input forms/%namespace%/%name%.html`,
  // },
  // "xtk:navtree": {
  //   filename: `/Administration/Configuration/Navigation hierarchies/%namespace%/%name%.html`,
  // },
  // "xtk:javascript": {
  //   filename: `/Administration/Configuration/JavaScript codes/%namespace%/%name%.html`,
  // },
  // "xtk:jssp": {
  //   filename: `/Administration/Configuration/Dynamic JavaScript pages/%namespace%/%name%.html`,
  // },
  "xtk:formRendering": {
    filename: `/Administration/Configuration/Form rendering/%internalName%.css`,
  },
  // "xtk:sql": {
  //   filename: `/Administration/Configuration/SQL scripts/%namespace%/%name%.sql`,
  // },
  // "xtk:xslt": {
  //   filename: `/Administration/Configuration/XSL style sheets/%namespace%/%name%.html`,
  // },
};
// DEFAULT
configs[CONFIG_DEFAULT_KEY] = {
  filename: `/.tmp/%namespace%_%schema%_%name%_%internalName%.xml`,
};

/**
 * @class CampaignInstance
 */
class CampaignInstance {
  constructor(client) {
    this.client = client;
    this.schemas = Object.keys(configs).filter(
      (key) => key !== CONFIG_DEFAULT_KEY,
    );

    this.client.registerObserver({
      onSOAPCall: (soapCall, safeRequestData) => {
        this.saveArchiveRequest(soapCall.request.data);
      },
      onSOAPCallSuccess: (soapCall, safeResponseData) => {
        this.saveArchiveResponse(soapCall.response);
      },
      onSOAPCallFailure: (soapCall, error) => {
        this.saveArchiveResponse(soapCall.response);
      },
    });
  }

  async check(downloadPath) {
    console.log("📡 Checking instance...");

    for (const schema of this.schemas) {
      const queryDef = {
        schema: schema,
        operation: "count",
      };
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

  async download(schema, folderPath, startLine) {
    const DomUtil = this.client.DomUtil;

    const queryDef = {
      schema: schema,
      operation: "select",
      select: {
        node: [{ expr: "data" }],
      },
      startLine: startLine,
      lineCount: 10, // @todo pagination
    };
    const queryDefXml = this.client.DomUtil.fromJSON(
      "queryDef",
      queryDef,
      "SimpleJson",
    );

    const query = this.client.NLWS.xml.xtkQueryDef.create(queryDefXml);

    const config = configs[schema] ? configs[schema] : configs["default"];
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

  isFolderEmpty(path) {
    return !fs.existsSync(path) || fs.readdirSync(path).length === 0;
  }

  saveArchiveRequest(rawRequest) {
    const archiveRequest =
      "archives/" + this.getArchiveDate() + "-CampaignInstance-request.xml";
    fs.outputFileSync(archiveRequest, rawRequest, function (errFs) {
      throw errFs;
    });
  }

  saveArchiveResponse(rawResponse) {
    const archiveResponse =
      "archives/" + this.getArchiveDate() + "-CampaignInstance-response.xml";
    fs.outputFileSync(archiveResponse, rawResponse, function (errFs) {
      throw errFs;
    });
  }

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
