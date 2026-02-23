# campaign-cli

## Getting started

First login
```bash
$ campaign auth init --host http://localhost:8080 --user admin --user admin --alias local
# ✅ Instance local2 added successfully.
# ↔️ Connecting as admin@http://localhost:8080...
# ✅ Logged in to instance1 (7.3.4 build 9364) successfully.
# 📡 Checking instance...
# - xtk:srcSchema: 207 found.
# - xtk:form: 185 found.
# - xtk:navtree: 11 found.
# - xtk:javascript: 126 found.
# - xtk:jssp: 53 found.
# - xtk:formRendering: 9 found.
# - xtk:sql: 69 found.
# - xtk:xslt: 98 found.

$ campaign instance pull --alias my-instance
# ✅ Logged in to instance1 (7.3.4 build 9364) successfully.
# ✨ Pulling instance to /Users/dist/local...
# /Users/dist/local/xtk_srcSchema (xtk:srcSchema)
#   /cus_Analytics.xml
#   /cus_new.xml
#   /nl_monitoring.xml
#   /nl_serverConf.xml
#   /nms_activeContact.xml
#   /nms_activeContactReport.xml
#   /nms_activeContactReportDetail.xml
#   /nms_address.xml
#   /nms_batchEvent.xml
#   /nms_billing.xml
# - xtk:srcSchema: 10 saved.
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
