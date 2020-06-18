## Prerequisites

* Install and run [coinosis](https://github.com/coinosis/coinosis)
* Install and run [owl](https://github.com/coinosis/owl)
* Install [ngrok](https://ngrok.com/). You don't need a user account.

## Development

### clone & install

```bash

git clone https://github.com/coinosis/cow.git -b dev
cd cow
npm install

```

### run

1. run `ngrok http 3000`
2. copy the https forwarding public url show by ngrok
3. on a different window, run `npm run start:dev $CALLBACK` where `$CALLBACK` is the copied url. Example: `npm run start:dev https://85e024fb3e96.ngrok.io`

```

* Point your browser to `http://localhost:9000`, point Metamask to `localhost:8545` and start developing with hot module replacement.

* Optionally, install [AutoFill](http://www.tohodo.com/autofill/help.html) to help you fill out credit card forms and import the autocomplete data from `autofill.csv`.

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
