## Prerequisites

* Install and run [coinosis](https://github.com/coinosis/coinosis)
* Install and run [owl](https://github.com/coinosis/owl)

## Development

### clone, install and run for development

```bash

git clone https://github.com/coinosis/cow.git -b dev
cd cow
npm i
npm run start:dev

```

Point your browser to `http://localhost:9000`, point Metamask to `localhost:8545` and start developing with hot module replacement.

### Submit your changes

1. Commit & push to the `dev` branch
2. Create a pull request targeting the `test` branch
3. Once accepted, check everything is working in [the test deployment](https://testing-cow.herokuapp.com)
4. Create a pull request targeting the `master` branch
5. Once accepted the code will be running live in [the production deployment](https://coinosis.github.io)

## Production

### Build cow for production

1. Make sure you're in the `master` branch and it is synced with GitHub
2. Run `webpack -p --define process.env.ENVIRONMENT="'production'"`
3. Copy the contents of the `dist/` folder to your webserver
