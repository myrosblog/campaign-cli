# campaign-cli

## Getting started

First login
```bash
$ campaign auth init --host http://localhost:8080 --user admin --password admin --alias local
```

```bash
# ✅ Instance local2 added successfully.
# ↔️ Connecting as admin@http://localhost:8080...
# ✅ Logged in to instance1 (7.3.4 build 9364) successfully.
# 📡 Checking instance...
# - xtk:srcSchema: 207 found.
# - xtk:form: 185 found.
# - xtk:javascript: 126 found.
# - xtk:sql: 69 found.

$ campaign instance pull --alias my-instance
# ✅ Logged in to instance1 (7.3.4 build 9364) successfully.
# ✨ Pulling instance to /Users/dist/local...
# /Users/dist/local/xtk_srcSchema (xtk:srcSchema)
#   /nl_monitoring.xml
#   /nl_serverConf.xml
#   /nms_activeContact.xml
#   /nms_address.xml
# - xtk:srcSchema: 10 saved.
```

## Advanced commands

Paths for download & config
```bash
$ campaign instance check --alias instance1 --path ~/dev/campaign-cli/dist/instance1 --config ./config/dist/instance1/campaign.config.json
```

Troubleshoot
```bash
# list aliases
$ campaign auth list

# test alias
$ campaign auth login --alias local
```


## Contribute

```bash
$ nvm use 22
$ npm run init
```

## Test

```bash
$ nvm use 22
$ npm run test
```
