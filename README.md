# campaign-cli

## Getting started

First login
```bash
$ campaign auth init --host http://localhost:8080 --user admin --user admin --alias local
✅ Instance local2 added successfully.
↔️ Trying to connect admin@http://localhost:8080...
✅ Logged in to instance1 (7.3.4 build 9364) successfully.

$ campaign instance pull --alias my-instance
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
