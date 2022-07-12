[![](https://user-images.githubusercontent.com/39338561/122415864-8d6a7c00-cf88-11eb-846f-a98a936f88da.png)
](https://kilt.io)

![Lint and Test](https://github.com/KILTprotocol/sdk-js/workflows/Lint%20and%20Test/badge.svg)

# KILT Polkadot Api Augmentation

Provides api augmentation for the KILT spiritnet.

## How to update type augmentation

1. Update metadata dump. To pull the latest metadata from the KILT spiritnet, run `yarn workspace @kiltprotocol/augment-api run update-metadata`. To pull from a custom endpoint, run `yarn workspace @kiltprotocol/augment-api run update-metadata -e <ENDPOINT_URL>`.
2. Run the type generation script: `yarn workspace @kiltprotocol/augment-api run build:types`.
3. Build the sdk (`yarn run build`) and fix type issues if necessary.
