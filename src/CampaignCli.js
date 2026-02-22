class CampaignCli {
  constructor(sdk) {
    this.sdk = sdk;
  }

  getSDKVersion() {
    return this.sdk.getSDKVersion();
  }
}

export default CampaignCli;
