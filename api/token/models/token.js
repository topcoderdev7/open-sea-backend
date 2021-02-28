'use strict';
const { OpenSeaPort, Network } = require("opensea-js");
const { ethers } = require("ethers");
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/models.html#lifecycle-hooks)
 * to customize this model
 */




 /**
 * An address (NFT contract)
 * And an id
 * Fetches the asset data
 */
const getAsset = async (
  address,
  tokenId,
)=> {
  const seaport = new OpenSeaPort(
    new ethers.providers.InfuraProvider(
      "homestead",
      process.env.INFURA_KEY,
    ), {
      networkName: Network.Main,
  });
  const result = await seaport.api.getAsset({
      tokenAddress: address,
      tokenId,
  });

  console.log("getAsset address", address);
  return { ...result, address, tokenId };
};

module.exports = {
  lifecycles: {
    async afterCreate(result, data) {
      console.log("token.afterCreate result", result)
      console.log("token.afterCreate data", data)
      const {id} = result
      const {address, tokenId} = data
      const {
        description,
        imageUrl,
        name
      } = await getAsset(address, tokenId)

      console.log("description", description)
      console.log("imageUrl", imageUrl)
      console.log("name", name)

      // Given this new data, update the token in strapi
      await strapi.services.token.update({id}, {
        description,
        imageUrl,
        name
      })
    }
  }
};