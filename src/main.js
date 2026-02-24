// packages
import { program, Command } from "commander";
import sdk from "@adobe/acc-js-sdk";
import Configstore from "configstore";
import fs from "node:fs";
import path from "node:path";
// Campaign
import CampaignError from "./CampaignError.js";
import CampaignAuth from "./CampaignAuth.js";
import CampaignInstance from "./CampaignInstance.js";


const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"));
const config = new Configstore(packageJson.name);
const auth = new CampaignAuth(sdk, config);
const defaultDistRoot = path.join(process.cwd());
const defaultConfigPath = path.join(process.cwd(), "config", "campaign.config.json");

// AUTH
program
  .command("auth")
  // INIT
  .addCommand(
    new Command()
      .name("init")
      .requiredOption(
        "--alias <alias>",
        "Local alias for this instance, e.g. prod, staging, local",
      )
      .requiredOption(
        "--host <url>",
        "URL of Adobe Campaign root, e.g. http://localhost:8080",
      )
      .requiredOption("--user <user>", "Operator username")
      .requiredOption("--password <pwd>", "Operator password")
      .action(async (options) => {
        try {
          await auth.init(options);
        } catch (err) {
          handleCampaignError(err);
        }
      }),
  )
  // LOGIN
  .addCommand(
    new Command()
      .name("login")
      .requiredOption(
        "--alias <alias>",
        "Local alias for this instance, e.g. prod, staging, local",
      )
      .action(async (options) => {
        try {
          await auth.login(options);
        } catch (err) {
          handleCampaignError(err);
        }
      }),
  )
  // LIST
  .addCommand(
    new Command().name("list").action(() => {
      try {
        auth.list();
      } catch (err) {
        handleCampaignError(err);
      }
    }),
  );

// INSTANCE
program
  .command("instance")
  // CHECK
  .addCommand(
    new Command()
      .name("check")
      .requiredOption(
        "--alias <alias>",
        "Local alias for this instance, e.g. prod, staging, local",
      )
      .option(
        "--path <path>",
        "Path where the command should run. Defaults to current working directory.",
        defaultDistRoot
      )
      .option(
        "--config <path>",
        "Path to the campaign.config.json file. Defaults ./config/campaign.config.json.",
        defaultConfigPath
      )
      .action(async (options) => {
        try {
          const campaignConfig = JSON.parse(fs.readFileSync(options.config));
          const client = await auth.login({ alias: options.alias });
          const instance = new CampaignInstance(client, campaignConfig);
          await instance.check(options.path);
        } catch (err) {
          handleCampaignError(err);
        }
      }),
  )
  // PULL
  .addCommand(
    new Command()
      .name("pull")
      .requiredOption(
        "--alias <alias>",
        "Local alias for this instance, e.g. prod, staging, local",
      )
      .option(
        "--path <path>",
        "Path where the command should run. Defaults to current working directory.",
        defaultDistRoot
      )
      .option(
        "--config <path>",
        "Path to the campaign.config.json file. Defaults ./config/campaign.config.json.",
        defaultConfigPath
      )
      .action(async (options) => {
        try {
          const campaignConfig = JSON.parse(fs.readFileSync(options.config));
          const client = await auth.login({ alias: options.alias });
          const instance = new CampaignInstance(client, campaignConfig);
          await instance.pull(options.path);
        } catch (err) {
          handleCampaignError(err);
        }
      }),
  );

program.parse(process.argv);

function handleCampaignError(err) {
  if (err instanceof CampaignError) {
    console.error(`⚠️ Campaign warning: ${err.message}`);
  } else {
    throw err;
  }
  process.exit(1);
}
