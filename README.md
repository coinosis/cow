## Developing

### clone & install

```bash

git clone https://github.com/coinosis/cow.git -b dev
cd cow
npm install

```

### run

cow is run by means of the `npm run start:dev` command. However, in orded to support processing PayU transactions, you need to provide a public callback URL as an argument to that command:

1. install [ngrok](https://ngrok.com/). You don't need a user account.
2. run `ngrok http 3000`
3. copy the https forwarding public url shown by ngrok
4. run `npm run start:dev <ngrok-url>`

After cow is running, point your web3-enabled browser to `http://localhost:9000`. Optionally, install [AutoFill](http://www.tohodo.com/autofill/help.html) to help you fill out credit card forms. Import the autocomplete data from `autofill.csv`

### submit your changes

Create a pull request targeting the `dev` branch

## Building

1. Run `webpack -p --define process.env.ENVIRONMENT="testing'"`
2. Serve the contents of the `dist/` folder

* In order to deploy to production, change the environment value to `production`.
