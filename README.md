[![Netlify Status](https://api.netlify.com/api/v1/badges/d86011f4-2a2f-4dda-a8e2-cdfed18285aa/deploy-status)](https://app.netlify.com/sites/coinosis/deploys)

## Developing

### clone & install

```bash

git clone https://github.com/coinosis/cow.git -b dev
cd cow
npm install

```

### run

`npm run start:dev [loclx-id]`

The optional `loclx-id` argument is only needed if running locally; it's the one you specified when you ran [owl](https://github.com/coinosis/owl).

After cow is running, point your web3-enabled browser to `http://localhost:9000`.

Optionally, install [AutoFill](http://www.tohodo.com/autofill/help.html) to help you fill out credit card forms. Import the autocomplete data from [this file](https://github.com/coinosis/cow/blob/dev/autofill.csv).

### submit your changes

Create a pull request targeting the `dev` branch

## Building

1. Run `webpack -p --define process.env.ENVIRONMENT="testing'"`
2. Serve the contents of the `dist/` folder

* In order to deploy to production, change the environment value to `production`.
