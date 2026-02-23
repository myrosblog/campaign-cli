import fs from "node:fs";
import path from "node:path";
import CampaignError from "./CampaignError.js";

/**
 * @class CampaignInstance
 */
class CampaignInstance {
  schemas = [
    "xtk:srcSchema",
    "xtk:form",
    "xtk:navtree",
    "xtk:javascript",
    "xtk:jssp",
    "xtk:formRendering",
    "xtk:sql",
    "xtk:xslt",
  ];

  constructor(client) {
    this.client = client;
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

    if (!this.isFolderEmpty(downloadPath)) {
      //   throw new CampaignError(
      //     `Directory already exists and is not empty. Please choose an empty directory or a different path.`,
      //   );
    }

    for (const schema of this.schemas) {
      const folderPath = downloadPath + "/" + schema.replace(":", "_");
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      console.log(`${folderPath} (${schema})`);

      const lineCount = 10;
      let startLine = 1;
      let recordsLength = 0;
      do {
        console.log(
          `  Downloading lines ${startLine} to ${startLine + lineCount - 1}...`,
        );
        recordsLength = await this.download(schema, folderPath, startLine);
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

    let message = "";
    var recordsLength = 0;
    try {
      const records = await query.executeQuery(); // DOMDocument <srcSchema-collection><srcSchema></srcSchema>...
      var child = DomUtil.getFirstChildElement(records);
      while (child) {
        recordsLength++;

        const namespace = DomUtil.getAttributeAsString(child, "namespace");
        const name = DomUtil.getAttributeAsString(child, "name");
        const filename = `${namespace}_${name}.xml`;
        const filepath = path.join(folderPath, filename);
        const data = DomUtil.toXMLString(child);
        fs.writeFileSync(filepath, data);
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
}

export default CampaignInstance;
