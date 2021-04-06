'use strict';
const axios = require('axios')
/**
 * Cron config that gives you an opportunity
 * to run scheduled jobs.
 *
 * The cron format consists of:
 * [SECOND (optional)] [MINUTE] [HOUR] [DAY OF MONTH] [MONTH OF YEAR] [DAY OF WEEK]
 *
 * See more details here: https://strapi.io/documentation/developer-docs/latest/concepts/configurations.html#cron-tasks
 */

/**
 * Check if asset has sold, for the api, if a last_sale exists, then the item was sold
 * @returns boolean
 */
const hasSold = (asset) => {
  return !!asset.last_sale
}

/**
 * Given a asset that sold return total price
 * @param {*} asset 
 * @returns 
 */
const soldFor = asset => {
  try {
    return asset.last_sale.total_price
  } catch(err){
    return ""
  }
}
/**
 * 
 * @param {*} asset 
 */
const auctionEnded = asset => {
  const salesOrder = asset.orders.find(order => String(order.side) === "1")
  if(!salesOrder){
    return false
  }

  return salesOrder.listing_time * 1000 > new Date().getTime();
}
module.exports = {
  /**
   * Once per hour, check for sales and end of auction events
   */
  '0 0 * * * *': async () => {
    // Get all asset that are currently on sale
    const allAssets = await strapi.services.token.find({_limit: -1, onSale: true, sold: false})
    console.log("allAssets", allAssets.length)

    const res = await Promise.all(allAssets.map(async(asset) => {
      try{
        const singleAssetCheck = await axios({
          method: "GET",
          url: `https://api.opensea.io/api/v1/asset/${asset.address}/${asset.tokenId}`,
          headers: {
            "X-API-KEY": process.env.OPENSEA_API_KEY || undefined
          }
        })
        const result = singleAssetCheck.data
        if(auctionEnded(result) || hasSold(result)){
          await strapi.services.token.update({id: asset.id}, {
            onSale: !auctionEnded(result),
            sold: hasSold(result),
            soldFor: soldFor(result)
          })
        }
      } catch(err){
        console.log("Exception in updating an asset", err)
      }
    }))

    // Check if it has sold
  }
};
